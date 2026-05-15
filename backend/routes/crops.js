import express from 'express';
import Crop from '../models/Crop.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.post('/', requireAuth, async (req, res) => {
  try {
    if (req.user.role !== 'farmer') return res.status(403).json({ message: 'Only farmers can list crops' });

    const { cropName, basePrice, weight, grade } = req.body;
    const farmerId = req.user.id || req.user._id;

    const crop = new Crop({
      farmerId,
      cropName,
      basePrice: Number(basePrice),
      currentBid: Number(basePrice),
      weight: Number(weight),
      grade
    });

    await crop.save();

    const populatedCrop = await Crop.findById(crop._id).populate('farmerId', 'name');
    
    const formattedCrop = {
      id: populatedCrop._id,
      cropName: populatedCrop.cropName,
      weight: populatedCrop.weight,
      basePrice: populatedCrop.basePrice,
      currentBid: populatedCrop.currentBid,
      farmerName: populatedCrop.farmerId?.name || 'Unknown Farmer',
      farmerId: populatedCrop.farmerId?._id.toString() 
    };

    req.app.get('io').emit('newCrop', formattedCrop);

    res.status(201).json(formattedCrop);
  } catch (error) {
    console.error("❌ Failed to save crop:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

router.get('/', requireAuth, async (req, res) => {
  try {
    const crops = await Crop.find({ status: 'active' }).populate('farmerId', 'name').sort({ createdAt: -1 });
    
    const formattedCrops = crops.map(crop => ({
      id: crop._id,
      cropName: crop.cropName,
      weight: crop.weight,
      basePrice: crop.basePrice,
      currentBid: crop.currentBid,
      farmerName: crop.farmerId?.name || 'Unknown Farmer',
      farmerId: crop.farmerId?._id.toString(),
      bidHistory: crop.bidHistory || [] 
    }));

    res.json(formattedCrops);
  } catch (error) {
    console.error("❌ Failed to fetch crops:", error);
    res.status(500).json({ message: 'Server error', details: error.message });
  }
});

export default router;