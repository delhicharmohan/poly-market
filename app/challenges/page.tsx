"use client";

import React, { useEffect, useState } from "react";
import { Zap, Plus, Search, Filter } from "lucide-react";
import ChallengeCard from "@/components/ChallengeCard";
import CreateChallengeModal from "@/components/CreateChallengeModal";
import axios from "axios";

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchChallenges();
  }, []);

  const fetchChallenges = async () => {
    try {
      const response = await axios.get("/api/challenges");
      setChallenges(response.data);
    } catch (error) {
      console.error("Error fetching challenges:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-2xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Zap className="h-6 w-6 text-blue-500 fill-blue-500/20" />
            Challenges
          </h1>
          <p className="text-slate-400 text-sm">P2P Dares & Friend Bets</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white p-3 rounded-full shadow-lg shadow-blue-900/20 transition-all active:scale-95"
        >
          <Plus className="h-6 w-6" />
        </button>
      </div>

      <div className="flex gap-2 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search challenges..." 
            className="w-full bg-slate-800 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-sm text-white focus:outline-none focus:border-blue-500/50"
          />
        </div>
        <button className="bg-slate-800 border border-slate-700 p-2.5 rounded-xl text-slate-400">
          <Filter className="h-5 w-5" />
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-slate-800 h-48 rounded-xl animate-pulse border border-slate-700/50" />
          ))}
        </div>
      ) : challenges.length === 0 ? (
        <div className="text-center py-20 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
          <Zap className="h-12 w-12 text-slate-700 mx-auto mb-4" />
          <h3 className="text-white font-semibold">No challenges yet</h3>
          <p className="text-slate-500 text-sm mt-1">Be the first to create one!</p>
          <button 
            onClick={() => setShowModal(true)}
            className="mt-6 text-blue-500 font-medium text-sm hover:underline"
          >
            Create a Challenge
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {challenges.map((challenge: any) => (
            <ChallengeCard key={challenge.id} challenge={challenge} />
          ))}
        </div>
      )}

      {showModal && (
        <CreateChallengeModal 
          onClose={() => setShowModal(false)}
          onSuccess={() => fetchChallenges()}
        />
      )}
    </div>
  );
}
