import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Routes & Models
import authRoutes from './routes/auth.js';
import cropRoutes from './routes/crops.js';
import Crop from './models/Crop.js';
import User from './models/User.js';

// Utilities
import { sendAuctionEndEmails } from './utils/email.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
app.set('io', io);

// --- AUTH MIDDLEWARE ---
const requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ message: 'Unauthorized: Invalid token' });
    req.user = decoded;
    next();
  });
};

// --- DATABASE CONNECTION ---
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

app.use('/api/auth', authRoutes);

app.get('/api/crops', requireAuth, async (req, res) => {
  try {
    const crops = await Crop.find({ status: 'active', endTime: { $gt: new Date() } })
      .populate('farmerId', 'name')
      .sort({ createdAt: -1 });
    
    const formattedCrops = crops.map(crop => ({
      ...crop.toObject(),
      id: crop._id,
      farmerName: crop.farmerId?.name || 'Unknown Farmer',
      farmerId: crop.farmerId?._id.toString()
    }));

    res.json(formattedCrops);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- HELPERS ---
const getCurrentSeason = () => {
  const month = new Date().getMonth() + 1;
  if ([11, 12, 1, 2].includes(month)) return "winter";
  if ([3, 4, 5, 6].includes(month)) return "summer";
  return "monsoon";
};

const getSeasonEncoded = (seasonStr) => {
  const map = { "winter": 0, "summer": 1, "monsoon": 2 };
  return map[seasonStr] ?? 2;
};

async function getRainfallFromCoords(lat, lon) {
  try {
    const url = 'https://power.larc.nasa.gov/api/temporal/climatology/point';
    const params = { 
        parameters: 'PRECTOTCORR', 
        community: 'AG', 
        longitude: lon, 
        latitude: lat, 
        format: 'JSON' 
    };
    
    const response = await axios.get(url, { params, timeout: 8000 });
    const monthly = response.data.properties.parameter.PRECTOTCORR;
    const daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    const monthKeys = ['JAN','FEB','MAR','APR','MAY','JUN','JUL','AUG','SEP','OCT','NOV','DEC'];

    const m = new Date().getMonth() + 1;
    let trimesterMonths = [7, 8, 9, 10]; 
    if ([11, 12, 1, 2].includes(m)) trimesterMonths = [11, 12, 1, 2];
    else if ([3, 4, 5, 6].includes(m)) trimesterMonths = [3, 4, 5, 6];

    let totalRain = trimesterMonths.reduce((acc, idx) => {
      const val = monthly[monthKeys[idx - 1]];
      return (val && val !== -999) ? acc + (val * daysInMonth[idx - 1]) : acc;
    }, 0);

    return totalRain === 0 ? 250.0 : totalRain;
  } catch (error) {
    return 250.0;
  }
}

app.post('/api/chat', requireAuth, async (req, res) => {
  const { message } = req.body;
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  
  const modelsToTry = ["gemini-2.5-flash", "gemini-2.0-flash"];
  let lastError = null;

  for (const modelName of modelsToTry) {
    try {
      const model = genAI.getGenerativeModel({ model: modelName });
      const prompt = `You are CropWise AI, an expert agronomist and market advisor helping an Indian farmer. 
      Keep your answers short, practical, and highly accurate. Provide insights on crops, weather, fertilizers, and Minimum Support Price (MSP) if asked.
      Farmer's message: "${message}"`;

      const result = await model.generateContent(prompt);
      const responseText = result.response.text();
      
      return res.json({ reply: responseText });
      
    } catch (error) {
      lastError = error;
      console.warn(`Model ${modelName} failed, trying next... Error:`, error.status);
      
      if (error.status !== 503 && error.status !== 429 && error.status !== 404) {
        break;
      }
    }
  }

  console.error("All Gemini models failed:", lastError);
  res.status(500).json({ 
    reply: "The AI system is currently overloaded due to high demand. Please try again in a few minutes." 
  });
});

// --- SENSOR DATA ENDPOINT (called by NodeMCU Arduino) ---
// BUG FIX 1: Route is /data — this matches the Arduino firmware exactly.
// BUG FIX 3: All incoming sensor values are now validated before
//            being forwarded to the ML model.
app.post('/data', async (req, res) => {
  try {
    const {
      temperature_c,
      air_humidity_pct,
      soil_temperature_c,
      soil_moisture_pct,
      lat,
      lon
    } = req.body;

    // BUG FIX 3: Reject the request if any sensor field is missing or NaN
    const fields = { temperature_c, air_humidity_pct, soil_temperature_c, soil_moisture_pct };
    for (const [key, value] of Object.entries(fields)) {
      if (value === undefined || value === null || isNaN(Number(value))) {
        console.error(`[Sensor] Invalid value for field "${key}":`, value);
        return res.status(400).json({
          error: `Invalid or missing sensor field: "${key}". Received: ${value}`
        });
      }
    }

    // BUG FIX 4: Validate lat/lon — reject GPS zeroes (no fix yet)
    const safeLat = (lat && lon && !(lat === 0 && lon === 0)) ? lat : 28.6139;
    const safeLon = (lat && lon && !(lat === 0 && lon === 0)) ? lon : 77.2090;

    const liveRainfall = await getRainfallFromCoords(safeLat, safeLon);
    const seasonString = getCurrentSeason();
    const seasonEncoded = getSeasonEncoded(seasonString);

    const mlPayload = {
      air_temp:             Number(temperature_c),
      soil_temp:            Number(soil_temperature_c),
      humidity:             Number(air_humidity_pct),
      moisture:             Number(soil_moisture_pct),
      rainfall:             liveRainfall,
      season_encoded:       seasonEncoded,
      query_season_encoded: seasonEncoded,
      is_correct_season:    1
    };

    console.log('[Sensor] Received valid data. Forwarding to ML:', mlPayload);

    const pythonResponse = await axios.post(`${process.env.ML_API_URL}/predict`, mlPayload);
    res.json({
      prediction: { 
        ...pythonResponse.data, 
        season: seasonString.charAt(0).toUpperCase() + seasonString.slice(1) 
      },
      sensor_data: { rainfall: liveRainfall }
    });
  } catch (error) {
    console.error('[Sensor] Error:', error.message);
    res.status(500).json({ error: "ML Microservice Unreachable" });
  }
});

// --- CROP POSTING ---
app.post('/api/crops', requireAuth, async (req, res) => {
  try {
    const { cropName, basePrice, weight, grade, durationHours } = req.body;
    const farmerId = req.user.id || req.user._id;
    const endTime = new Date(Date.now() + (durationHours || 24) * 60 * 60 * 1000);

    const crop = new Crop({
      farmerId, cropName, grade, weight: Number(weight),
      basePrice: Number(basePrice),
      currentBid: Number(basePrice),
      endTime
    });

    await crop.save();
    const populated = await Crop.findById(crop._id).populate('farmerId', 'name');
    
    const formatted = { ...populated.toObject(), id: populated._id };
    io.emit('newCrop', formatted);
    res.status(201).json(formatted);
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// --- AUTO-CLOSE ENGINE ---
setInterval(async () => {
  try {
    const expiredCrops = await Crop.find({ status: 'active', endTime: { $lte: new Date() } })
      .populate('farmerId').populate('bidHistory.bidderId');

    for (let crop of expiredCrops) {
      crop.status = 'closed';
      await crop.save();

      const uniqueBidders = [];
      const seenIds = new Set();
      const sortedHistory = [...crop.bidHistory].sort((a, b) => b.amount - a.amount);

      for (const bid of sortedHistory) {
        if (bid.bidderId && !seenIds.has(bid.bidderId._id.toString())) {
          uniqueBidders.push(bid);
          seenIds.add(bid.bidderId._id.toString());
        }
        if (uniqueBidders.length === 3) break;
      }

      if (uniqueBidders.length > 0) await sendAuctionEndEmails(crop.farmerId, uniqueBidders, crop);
      io.emit('auctionClosed', { auctionId: crop._id });
    }
  } catch (err) { console.error("Engine Error:", err); }
}, 60000);

// --- SOCKET.IO AUTH & LOGIC ---
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error'));
  
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return next(new Error('Authentication error'));
    socket.user = decoded;
    next();
  });
});

io.on('connection', (socket) => {
  socket.on('placeBid', async (data) => {
    try {
      const { auctionId, bidAmount } = data;
      
      const crop = await Crop.findOneAndUpdate(
        { 
          _id: auctionId, 
          status: 'active', 
          endTime: { $gt: new Date() },
          currentBid: { $lte: bidAmount - 10 } 
        },
        { 
          $set: { currentBid: bidAmount, currentBidder: socket.user.id },
          $push: { 
            bidHistory: { 
              bidderId: socket.user.id, 
              bidderName: socket.user.name || "Anonymous", 
              amount: bidAmount 
            } 
          }
        },
        { new: true }
      );

      if (crop) {
        io.emit('bidUpdate', {
          auctionId: crop._id,
          newBid: bidAmount,
          bidHistory: crop.bidHistory
        });
      }
    } catch (error) { console.error("Bid Error:", error); }
  });

  socket.on('acceptBid', async (data) => {
    try {
      const { auctionId } = data;
      const crop = await Crop.findOne({ _id: auctionId, farmerId: socket.user.id, status: 'active' })
          .populate('farmerId').populate('currentBidder');
      
      if (crop && crop.currentBidder) {
        crop.status = 'closed';
        await crop.save();
        io.emit('auctionClosed', { auctionId: crop._id, winnerId: crop.currentBidder._id });
      }
    } catch (error) { console.error("Accept Bid Error:", error); }
  });
});

const PORT = process.env.PORT || 3000;
// Adding '0.0.0.0' forces the server to accept connections from the ESP8266
server.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT} across all networks`));
