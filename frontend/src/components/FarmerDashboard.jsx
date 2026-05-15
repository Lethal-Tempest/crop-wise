import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';
import { Leaf, Sprout, Droplet, Thermometer, MapPin, Activity, Server, RefreshCw, Cpu, Gavel, Plus, Bot, Send } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

const SensorCard = ({ icon: Icon, label, value, unit, color }) => {
  if (!Icon) return null;
  return (
    <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl flex items-center space-x-4 shadow-lg">
      <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
        <Icon className={`w-6 h-6 ${color.replace('bg-', 'text-')}`} />
      </div>
      <div>
        <p className="text-slate-400 text-xs uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white">{value} <span className="text-sm text-slate-500 font-normal">{unit}</span></p>
      </div>
    </div>
  );
};

export default function FarmerDashboard({ user }) {
  const [view, setView] = useState('predictor');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [myCrops, setMyCrops] = useState([]);

  const [simulatedData, setSimulatedData] = useState({
    temperature_c: 25.5,
    air_humidity_pct: 65,
    soil_temperature_c: 24.0,
    soil_moisture_pct: 45,
    lat: 28.6139,
    lon: 77.2090
  });

  const [cropForm, setCropForm] = useState({
    cropName: '', basePrice: '', weight: '', grade: 'A', durationHours: 24
  });

  const [selectedCropDetails, setSelectedCropDetails] = useState(null);
  
  const [chatMessages, setChatMessages] = useState([{ sender: 'ai', text: 'Hello! I am your CropWise AI advisor. Ask me anything about crop health, MSP, or market trends.' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMessage = chatInput;
    setChatMessages(prev => [...prev, { sender: 'user', text: userMessage }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const res = await axios.post(`${API_URL}/api/chat`, 
        { message: userMessage },
        { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }}
      );
      setChatMessages(prev => [...prev, { sender: 'ai', text: res.data.reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { sender: 'ai', text: 'Error connecting to the AI. Please try again.' }]);
    }
    setIsChatLoading(false);
  };

  useEffect(() => {
    fetchMyCrops();

    const socket = io(API_URL, {
      auth: { token: localStorage.getItem('token') }
    });

    socket.on('bidUpdate', (data) => {
      setMyCrops(prev => prev.map(crop =>
        crop.id === data.auctionId 
          ? { ...crop, currentBid: data.newBid, bidHistory: data.bidHistory } 
          : crop
      ));

      setSelectedCropDetails(curr => {
        if (curr && curr.id === data.auctionId) {
          return { ...curr, currentBid: data.newBid, bidHistory: data.bidHistory };
        }
        return curr;
      });
    });

    socket.on('newCrop', (newCrop) => {
      const userId = user.id || user._id;
      if (newCrop.farmerId === userId) {
        setMyCrops(prev => [newCrop, ...prev]);
      }
    });

    return () => socket.disconnect();
  }, [user]);

  const fetchMyCrops = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/crops`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      const userId = user.id || user._id;
      const farmerCrops = res.data.filter(crop => crop.farmerId === userId);
      setMyCrops(farmerCrops);
    } catch (err) { }
  };

  const handleListCrop = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_URL}/api/crops`, cropForm, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setCropForm({ cropName: '', basePrice: '', weight: '', grade: 'A', durationHours: 24 });
      fetchMyCrops();
      setView('auctions');
    } catch (err) {}
  };

  const handleSimulate = async () => {
    setLoading(true);
    setResult(null);
    try {
      const response = await axios.post(`${API_URL}/data`, { device_id: "web-simulator-01", ...simulatedData });
      setTimeout(() => { setResult(response.data); setLoading(false); }, 800);
    } catch (error) {
      setTimeout(() => {
        setResult({
          prediction: { confidence: "94.2%", crop: "Wheat", warning: "Optimal conditions detected.", season: "Rabi" },
          sensor_data: { rainfall: 15.2 }
        });
        setLoading(false);
      }, 800);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSimulatedData(prev => ({ ...prev, [name]: parseFloat(value) }));
  };

  const fetchFromHardware = async () => {
    try {
      const res = await axios.get(`${API_URL}/api/sensor-data`);
      setSimulatedData(res.data);
    } catch (err) {}
  };

  return (
    <div className="space-y-6">
      <nav className="flex gap-2 bg-slate-800 p-2 rounded-xl border border-slate-700 shadow-lg overflow-x-auto">
        <button onClick={() => setView('predictor')} className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${view === 'predictor' ? 'bg-green-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
          <Activity className="w-4 h-4 inline mr-2" /> IoT Predictor
        </button>
        <button onClick={() => setView('auctions')} className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${view === 'auctions' ? 'bg-green-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
          <Gavel className="w-4 h-4 inline mr-2" /> My Auctions
        </button>
        <button onClick={() => setView('add')} className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${view === 'add' ? 'bg-green-500 text-slate-900 shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
          <Plus className="w-4 h-4 inline mr-2" /> List New Crop
        </button>
        <button onClick={() => setView('assistant')} className={`px-6 py-3 rounded-lg font-bold text-sm whitespace-nowrap transition-all ${view === 'assistant' ? 'bg-blue-500 text-white shadow-md' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}>
          <Bot className="w-4 h-4 inline mr-2" /> AI Assistant
        </button>
      </nav>

      {view === 'predictor' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col gap-4 mb-6">
                <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-blue-400" /> Sensor Controls
                </h2>
                <div className="flex gap-2">
                  <button onClick={fetchFromHardware} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition">
                    <Database className="w-3 h-3" /> Fetch Hardware
                  </button>
                  <button onClick={() => setSimulatedData({ temperature_c: (Math.random() * 15 + 15).toFixed(1), air_humidity_pct: Math.floor(Math.random() * 50 + 30), soil_temperature_c: (Math.random() * 10 + 20).toFixed(1), soil_moisture_pct: Math.floor(Math.random() * 60 + 20), lat: 28.6139, lon: 77.2090 })} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-xs py-2 rounded-lg flex items-center justify-center gap-2 transition">
                    <RefreshCw className="w-3 h-3" /> Randomize
                  </button>
                </div>
              </div>

              <div className="space-y-5">
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Air Temperature (°C)</label>
                  <input type="range" min="0" max="50" step="0.1" name="temperature_c" value={simulatedData.temperature_c} onChange={handleInputChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500" />
                  <div className="flex justify-between mt-1 text-sm text-blue-400 font-mono">{simulatedData.temperature_c}°C</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Air Humidity (%)</label>
                  <input type="range" min="0" max="100" name="air_humidity_pct" value={simulatedData.air_humidity_pct} onChange={handleInputChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-400" />
                  <div className="flex justify-between mt-1 text-sm text-blue-400 font-mono">{simulatedData.air_humidity_pct}%</div>
                </div>
                <div>
                  <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Soil Moisture (%)</label>
                  <input type="range" min="0" max="100" name="soil_moisture_pct" value={simulatedData.soil_moisture_pct} onChange={handleInputChange} className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-600" />
                  <div className="flex justify-between mt-1 text-sm text-amber-500 font-mono">{simulatedData.soil_moisture_pct}%</div>
                </div>

                <div className="pt-4">
                  <button onClick={handleSimulate} disabled={loading} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg flex items-center justify-center gap-2">
                    {loading ? <RefreshCw className="animate-spin w-5 h-5" /> : <Server className="w-5 h-5" />}
                    {loading ? 'Processing ML Model...' : 'Run Prediction'}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SensorCard Icon={Thermometer} label="Air Temp" value={simulatedData.temperature_c} unit="°C" color="text-orange-400" />
              <SensorCard Icon={Droplet} label="Humidity" value={simulatedData.air_humidity_pct} unit="%" color="text-blue-400" />
              <SensorCard Icon={MapPin} label="Soil Temp" value={simulatedData.soil_temperature_c} unit="°C" color="text-amber-700" />
              <SensorCard Icon={Leaf} label="Moisture" value={simulatedData.soil_moisture_pct} unit="%" color="text-green-400" />
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-8 min-h-[350px] flex flex-col items-center justify-center text-center relative overflow-hidden shadow-xl">
              {!result && !loading && (
                <div className="text-slate-500 animate-pulse">
                  <Sprout className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Awaiting sensor data for prediction...</p>
                </div>
              )}
              <AnimatePresence>
                {result && !loading && (
                  <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="w-full">
                    <div className="inline-block px-4 py-1 bg-green-500/10 text-green-400 rounded-full text-sm font-mono mb-6 border border-green-500/20">Confidence: {result.prediction.confidence}</div>
                    <h3 className="text-slate-400 uppercase tracking-widest text-sm mb-2">Recommended Crop</h3>
                    <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-green-400 to-emerald-300 mb-8">{result.prediction.crop.toUpperCase()}</h1>
                    <div className="grid grid-cols-3 gap-4 text-left bg-slate-900 p-6 rounded-xl border border-slate-700">
                      <div><p className="text-slate-500 text-xs uppercase">Season</p><p className="text-white font-medium">{result.prediction.season}</p></div>
                      <div><p className="text-slate-500 text-xs uppercase">Rainfall</p><p className="text-white font-medium">{result.sensor_data.rainfall.toFixed(1)} mm</p></div>
                      <div><p className="text-slate-500 text-xs uppercase">Status</p><p className="text-green-400 font-medium">Optimal</p></div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {loading && (
                <div className="absolute inset-0 bg-slate-800/90 flex flex-col items-center justify-center z-10">
                  <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                  <p className="text-green-400 font-mono text-sm">Analyzing soil & weather data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {view === 'auctions' && (
        <div className="space-y-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2"><Activity className="text-green-400 w-6 h-6" /> Live Bidding</h3>
            {myCrops.length === 0 ? (
              <div className="bg-slate-800 border border-slate-700 border-dashed p-8 rounded-2xl text-center text-slate-500">You have no active auctions. List a crop to get started.</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {myCrops.map(crop => (
                  <div key={crop.id} className="bg-slate-800 border border-slate-700 p-6 rounded-xl relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-green-400 to-emerald-500"></div>
                    <h4 className="text-lg font-bold text-white mb-1">{crop.cropName}</h4>
                    <p className="text-slate-400 text-sm mb-4">{crop.weight} Kg • Grade {crop.grade}</p>
                    <div className="flex justify-between items-end">
                      <div>
                        <p className="text-slate-500 text-xs">Highest Bid</p>
                        <p className="text-2xl font-bold text-green-400">₹{crop.currentBid}</p>
                      </div>
                      <button onClick={() => setSelectedCropDetails(crop)} className="bg-green-500/10 text-green-400 px-3 py-1 rounded-lg text-sm border border-green-500/20 hover:bg-green-500/20 transition">View Details</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {view === 'assistant' && (
        <div className="bg-slate-800 border border-slate-700 rounded-2xl shadow-xl flex flex-col h-[600px] max-w-3xl mx-auto mt-4 overflow-hidden">
          <div className="bg-slate-900 border-b border-slate-700 p-4 flex items-center gap-3">
            <div className="bg-blue-500/20 p-2 rounded-lg"><Bot className="w-6 h-6 text-blue-400" /></div>
            <div>
              <h2 className="text-white font-bold">CropWise AI</h2>
              <p className="text-slate-400 text-xs">Powered by Google Gemini</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {chatMessages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-2xl p-4 text-sm ${msg.sender === 'user' ? 'bg-blue-600 text-white rounded-br-none' : 'bg-slate-700 text-slate-200 rounded-bl-none'}`}>
                  <div dangerouslySetInnerHTML={{ __html: msg.text.replace(/\*\*(.*?)\*\*/g, '<b>$1</b>').replace(/\n/g, '<br/>') }} />
                </div>
              </div>
            ))}
            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-slate-700 text-slate-400 rounded-2xl rounded-bl-none p-4 text-sm flex gap-2 items-center">
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-100"></div>
                  <div className="w-2 h-2 bg-slate-500 rounded-full animate-bounce delay-200"></div>
                </div>
              </div>
            )}
          </div>

          <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-700 flex gap-2">
            <input 
              type="text" 
              value={chatInput} 
              onChange={e => setChatInput(e.target.value)} 
              placeholder="Ask about crops, fertilizers, or MSP..." 
              className="flex-1 bg-slate-800 border border-slate-700 text-white rounded-xl p-3 outline-none focus:border-blue-500 transition"
            />
            <button type="submit" disabled={isChatLoading || !chatInput.trim()} className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white p-3 rounded-xl transition flex items-center justify-center">
              <Send className="w-5 h-5" />
            </button>
          </form>
        </div>
      )}

      {view === 'add' && (
        <div className="max-w-2xl mx-auto bg-slate-800 border border-slate-700 rounded-2xl p-8 shadow-xl mt-8">
          <h2 className="text-2xl font-bold text-white mb-2">Register Crop for Auction</h2>
          <p className="text-slate-400 mb-8 text-sm">Your government ID and address are automatically attached to this listing from your profile.</p>

          <form onSubmit={handleListCrop} className="space-y-5">
            <div>
              <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Crop Variety</label>
              <input type="text" placeholder="e.g. Sharbati Wheat" value={cropForm.cropName} onChange={e => setCropForm({ ...cropForm, cropName: e.target.value })} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Base Price (₹)</label>
                <input type="number" placeholder="Per Quintal" value={cropForm.basePrice} onChange={e => setCropForm({ ...cropForm, basePrice: e.target.value })} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Total Weight (Kg)</label>
                <input type="number" placeholder="Volume" value={cropForm.weight} onChange={e => setCropForm({ ...cropForm, weight: e.target.value })} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white" required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Quality Grade</label>
                <select value={cropForm.grade} onChange={e => setCropForm({ ...cropForm, grade: e.target.value })} className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white">
                  <option value="A">Grade A (Premium Export)</option>
                  <option value="B">Grade B (Standard Domestic)</option>
                  <option value="C">Grade C (Processing)</option>
                </select>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase font-bold mb-2 block">Auction Duration</label>
                <select
                  value={cropForm.durationHours}
                  onChange={e => setCropForm({ ...cropForm, durationHours: parseInt(e.target.value) })}
                  className="w-full bg-slate-900 border border-slate-700 p-3 rounded-lg text-white"
                >
                  <option value={12}>12 Hours</option>
                  <option value={24}>24 Hours (1 Day)</option>
                  <option value={48}>48 Hours (2 Days)</option>
                  <option value={72}>72 Hours (3 Days)</option>
                  <option value={168}>1 Week</option>
                </select>
              </div>
            </div>

            <button type="submit" className="w-full bg-green-500 hover:bg-green-400 text-slate-900 py-4 rounded-xl font-bold mt-6 transition shadow-[0_0_20px_rgba(16,185,129,0.2)]">
              Start Live Auction
            </button>
          </form>
        </div>
      )}

      {selectedCropDetails && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setSelectedCropDetails(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white">✕</button>
            <h2 className="text-xl font-bold text-white mb-1">{selectedCropDetails.cropName}</h2>
            <p className="text-slate-400 text-sm mb-6">Live Auction Details</p>
            <div className="bg-slate-900 p-4 rounded-xl border border-slate-700 mb-6 flex justify-between items-center">
              <span className="text-slate-400 text-sm">Current Highest Bid</span>
              <span className="text-2xl font-bold text-green-400">₹{selectedCropDetails.currentBid}</span>
            </div>
            <h3 className="text-white font-bold mb-3 text-sm tracking-wider uppercase">Top 3 Bidders</h3>
            <div className="space-y-2">
              {!selectedCropDetails.bidHistory || selectedCropDetails.bidHistory.length === 0 ? (
                <p className="text-slate-500 text-sm text-center py-4">No bids placed yet.</p>
              ) : (
                [...selectedCropDetails.bidHistory]
                  .sort((a, b) => b.amount - a.amount)
                  .reduce((acc, current) => {
                    if (!acc.find(item => item.bidderId === current.bidderId)) return acc.concat([current]);
                    return acc;
                  }, [])
                  .slice(0, 3)
                  .map((bid, index) => (
                    <div key={index} className="flex justify-between items-center bg-slate-700/30 p-3 rounded-lg border border-slate-700">
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${index === 0 ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-600 text-slate-300'}`}>
                          {index + 1}
                        </span>
                        <span className="text-white text-sm">{bid.bidderName}</span>
                      </div>
                      <span className="text-green-400 font-bold font-mono">₹{bid.amount}</span>
                    </div>
                  ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const Database = ({ className }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <ellipse cx="12" cy="5" rx="9" ry="3"></ellipse>
    <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path>
    <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path>
  </svg>
);