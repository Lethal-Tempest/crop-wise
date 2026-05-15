import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['farmer', 'wholesaler'], required: true },
  name: { type: String, required: true },
  phone: { type: String, required: true }, 
  address: { type: String, required: true },
  govtId: { type: String, required: true },
  gstNumber: { type: String }
}, { timestamps: true });

export default mongoose.model('User', userSchema);