import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { io } from 'socket.io-client';
import { Gavel, CheckCircle, RefreshCw } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL;

export default function WholesalerDashboard({ user }) {
  const [activeAuctions, setActiveAuctions] = useState([]);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [socket, setSocket] = useState(null);
  const [matchFound, setMatchFound] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchAuctions = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/api/crops`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
      });
      setActiveAuctions(res.data);
      if (selectedAuction) {
        const updatedSelected = res.data.find(a => a.id === selectedAuction.id);
        if (updatedSelected) setSelectedAuction(updatedSelected);
      }
    } catch (err) {
      console.error("Error fetching auctions", err);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAuctions();

    // 1. RE-ADD THE MISSING INITIALIZATION
    const newSocket = io(API_URL, {
      auth: { token: localStorage.getItem('token') }
    });
    setSocket(newSocket);

    // 2. Add all the listeners
    newSocket.on('bidUpdate', (data) => {
      setActiveAuctions(prev => prev.map(auction =>
        auction.id === data.auctionId ? { ...auction, currentBid: data.newBid } : auction
      ));

      setSelectedAuction(prev => {
        if (prev && prev.id === data.auctionId) return { ...prev, currentBid: data.newBid };
        return prev;
      });
    });

    newSocket.on('newCrop', (newCrop) => {
      setActiveAuctions(prev => [newCrop, ...prev]);
    });

    newSocket.on('auctionClosed', (data) => {
      if (data.winnerId === user.id) setMatchFound(true);
    });

    return () => newSocket.disconnect();
  }, [user.id]);

  const placeBid = (e) => {
    e.preventDefault();
    const minBid = selectedAuction.currentBid + 10;

    if (parseFloat(bidAmount) < minBid) {
      alert(`Bid must be at least ₹${minBid}.`);
      return;
    }
    socket.emit('placeBid', { auctionId: selectedAuction.id, bidAmount: parseFloat(bidAmount) });
    setBidAmount('');
  };

  if (matchFound) {
    return (
      <div className="bg-green-500/10 border border-green-500 p-8 rounded-2xl text-center max-w-2xl mx-auto mt-12">
        <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
        <h2 className="text-3xl font-bold text-white mb-2">Auction Won!</h2>
        <p className="text-slate-300 mb-6">Your bid was accepted. An automated email has been sent to both you and the farmer containing contact details to coordinate logistics and payment.</p>
        <button onClick={() => { setMatchFound(false); fetchAuctions(); setSelectedAuction(null); }} className="bg-green-500 text-slate-900 px-6 py-2 rounded-lg font-bold hover:bg-green-400 transition">Return to Market</button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      <div className="lg:col-span-1 space-y-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Live Markets</h2>
          <button onClick={fetchAuctions} className="text-slate-400 hover:text-white transition">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="space-y-3 max-h-[700px] overflow-y-auto pr-2">
          {activeAuctions.length === 0 && !loading && (
            <div className="bg-slate-800 border border-slate-700 p-6 rounded-xl text-center text-slate-500">No active crops available right now.</div>
          )}
          {activeAuctions.map(auction => (
            <div
              key={auction.id}
              onClick={() => setSelectedAuction(auction)}
              className={`p-5 rounded-xl border cursor-pointer transition-all ${selectedAuction?.id === auction.id ? 'bg-slate-800 border-green-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]' : 'bg-slate-800/50 border-slate-700 hover:border-slate-500 hover:bg-slate-800'}`}
            >
              <div className="flex justify-between items-start mb-2">
                <h3 className="text-lg font-bold text-white">{auction.cropName}</h3>
                <span className="bg-blue-500/20 text-blue-400 px-2 py-1 rounded text-xs font-bold">{auction.weight} kg</span>
              </div>
              <p className="text-slate-400 text-xs mb-4">Farmer: {auction.farmerName}</p>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-500">Base: ₹{auction.basePrice}</span>
                <span className="text-green-400 font-bold">Current: ₹{auction.currentBid}</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedAuction ? (
          <div className="bg-slate-800 border border-slate-700 p-8 rounded-2xl shadow-2xl sticky top-6">
            <div className="flex justify-between items-start mb-8 border-b border-slate-700 pb-6">
              <div className="flex items-center gap-3">
                <Gavel className="w-8 h-8 text-amber-400" />
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedAuction.cropName}</h2>
                  <p className="text-slate-400 text-sm">Lot ID: #{selectedAuction.id.slice(-6)} • {selectedAuction.weight} Kg</p>
                </div>
              </div>
            </div>

            <div className="bg-slate-900 border border-slate-700 p-8 rounded-xl text-center mb-8 relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-orange-500"></div>
              <p className="text-slate-400 mb-2 uppercase tracking-widest text-sm font-bold">Highest Bid</p>
              <p className="text-6xl font-black text-green-400">₹{selectedAuction.currentBid}</p>
            </div>

            <form onSubmit={placeBid} className="space-y-4 max-w-md mx-auto">
              <div>
                <label className="text-sm text-slate-400 mb-2 block font-bold text-center">Place Your Bid (₹)</label>
                <input
                  type="number"
                  value={bidAmount}
                  onChange={e => setBidAmount(e.target.value)}
                  placeholder={`Minimum ₹${selectedAuction.currentBid + 10}`}
                  className="w-full bg-slate-900 border border-slate-700 p-4 rounded-xl text-white text-center text-xl font-bold focus:border-green-500 focus:ring-1 focus:ring-green-500 outline-none transition"
                  required
                />
              </div>
              <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-slate-900 font-black py-4 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)] transition transform active:scale-95 text-lg">
                Submit Bid
              </button>
            </form>
          </div>
        ) : (
          <div className="bg-slate-800 border border-slate-700 border-dashed p-8 rounded-2xl flex flex-col items-center justify-center h-full min-h-[500px] text-slate-500">
            <Gavel className="w-16 h-16 mb-4 opacity-20" />
            <p className="text-center text-lg">Select an auction from the market<br />to enter the live bidding room.</p>
          </div>
        )}
      </div>
    </div>
  );
}