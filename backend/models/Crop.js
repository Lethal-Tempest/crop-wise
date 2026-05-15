import mongoose from 'mongoose';

const cropSchema = new mongoose.Schema({
  farmerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  cropName: { type: String, required: true },
  basePrice: { type: Number, required: true },
  weight: { type: Number, required: true },
  grade: { type: String, required: true },
  currentBid: { type: Number, required: true },
  currentBidder: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  
  endTime: { type: Date, required: true },
  
  bidHistory: [{
    bidderId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    bidderName: String, 
    amount: Number,
    timestamp: { type: Date, default: Date.now }
  }],
  
  status: { type: String, enum: ['active', 'closed'], default: 'active' }
}, { timestamps: true });

export default mongoose.model('Crop', cropSchema);