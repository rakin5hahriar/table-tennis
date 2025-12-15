import React, { useState, useEffect } from 'react';
import { Trophy, AlertCircle, Check, ChevronRight, Award, Users, Target } from 'lucide-react';

const TournamentManager = () => {
  // Phase management
  const [phase, setPhase] = useState('setup'); // 'setup' | 'group' | 'knockout' | 'complete'
  const [numTeams, setNumTeams] = useState(4);
  
  // Core data
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [champion, setChampion] = useState(null);
  
  // UI state
  const [teamNames, setTeamNames] = useState(['', '', '', '', '']);
  const [error, setError] = useState('');

  // Generate Round Robin matches for Group Stage
  const generateGroupMatches = (teamsList) => {
    const groupMatches = [];
    let matchId = 1;
    
    for (let i = 0; i < teamsList.length; i++) {
      for (let j = i + 1; j < teamsList.length; j++) {
        groupMatches.push({
          id: matchId++,
          phase: 'group',
          teamA: { id: teamsList[i].id, name: teamsList[i].name },
          teamB: { id: teamsList[j].id, name: teamsList[j].name },
          scoreA: 0,
          scoreB: 0,
          winnerId: null,
          completed: false
        });
      }
    }
    
    return groupMatches;
  };

  // Start tournament
  const startTournament = () => {
    setError('');
    
    // Validate team names
    const validNames = teamNames.slice(0, numTeams).filter(name => name.trim() !== '');
    if (validNames.length !== numTeams) {
      setError(`Please enter names for all ${numTeams} teams`);
      return;
    }
    
    // Check for duplicate names
    const uniqueNames = new Set(validNames.map(name => name.trim()));
    if (uniqueNames.size !== validNames.length) {
      setError('Team names must be unique');
      return;
    }
    
    // Initialize teams
    const initialTeams = validNames.map((name, index) => ({
      id: index + 1,
      name: name.trim(),
      matchesPlayed: 0,
      wins: 0,
      losses: 0,
      totalPoints: 0
    }));
    
    setTeams(initialTeams);
    setMatches(generateGroupMatches(initialTeams));
    setPhase('group');
  };

  // Update match score
  const updateScore = (matchId, team, increment) => {
    setMatches(prevMatches => 
      prevMatches.map(match => {
        if (match.id === matchId && !match.completed) {
          const newMatch = { ...match };
          const currentScore = team === 'A' ? newMatch.scoreA : newMatch.scoreB;
          const newScore = Math.max(0, currentScore + increment);
          
          if (team === 'A') {
            newMatch.scoreA = newScore;
          } else {
            newMatch.scoreB = newScore;
          }
          
          return newMatch;
        }
        return match;
      })
    );
  };

  // Finish match and apply The Accumulator scoring
  const finishMatch = (matchId) => {
    setMatches(prevMatches => {
      const match = prevMatches.find(m => m.id === matchId);
      if (!match || match.completed) return prevMatches;
      
      // Determine winner (must be at 21)
      let winnerId = null;
      if (match.scoreA >= 21) winnerId = match.teamA.id;
      else if (match.scoreB >= 21) winnerId = match.teamB.id;
      
      if (!winnerId) return prevMatches;
      
      // Update teams with The Accumulator scoring
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === match.teamA.id) {
            return {
              ...team,
              matchesPlayed: team.matchesPlayed + 1,
              wins: winnerId === team.id ? team.wins + 1 : team.wins,
              losses: winnerId !== team.id ? team.losses + 1 : team.losses,
              totalPoints: team.totalPoints + (winnerId === team.id ? 26 : match.scoreA)
            };
          } else if (team.id === match.teamB.id) {
            return {
              ...team,
              matchesPlayed: team.matchesPlayed + 1,
              wins: winnerId === team.id ? team.wins + 1 : team.wins,
              losses: winnerId !== team.id ? team.losses + 1 : team.losses,
              totalPoints: team.totalPoints + (winnerId === team.id ? 26 : match.scoreB)
            };
          }
          return team;
        })
      );
      
      // Mark match as completed
      return prevMatches.map(m => 
        m.id === matchId 
          ? { ...m, winnerId, completed: true }
          : m
      );
    });
  };

  // Get sorted leaderboard
  const getLeaderboard = () => {
    return [...teams].sort((a, b) => b.totalPoints - a.totalPoints);
  };

  // Check if all group matches are complete
  const allGroupMatchesComplete = () => {
    const groupMatches = matches.filter(m => m.phase === 'group');
    return groupMatches.length > 0 && groupMatches.every(m => m.completed);
  };

  // Generate knockout bracket
  const startKnockout = () => {
    const leaderboard = getLeaderboard();
    const knockoutMatches = [];
    let matchId = matches.length + 1;
    
    if (numTeams === 3) {
      // Only Final: Rank 1 vs Rank 2 (Rank 3 eliminated)
      knockoutMatches.push({
        id: matchId++,
        phase: 'final',
        teamA: { id: leaderboard[0].id, name: leaderboard[0].name },
        teamB: { id: leaderboard[1].id, name: leaderboard[1].name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
    } else if (numTeams === 4) {
      // Semi 1: Rank 1 vs Rank 4
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: leaderboard[0].id, name: leaderboard[0].name },
        teamB: { id: leaderboard[3].id, name: leaderboard[3].name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 2: Rank 2 vs Rank 3
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: leaderboard[1].id, name: leaderboard[1].name },
        teamB: { id: leaderboard[2].id, name: leaderboard[2].name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Final: TBD
      knockoutMatches.push({
        id: matchId++,
        phase: 'final',
        teamA: { id: null, name: 'TBD' },
        teamB: { id: null, name: 'TBD' },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
    } else if (numTeams === 5) {
      // Qualifier: Rank 4 vs Rank 5
      knockoutMatches.push({
        id: matchId++,
        phase: 'qualifier',
        teamA: { id: leaderboard[3].id, name: leaderboard[3].name },
        teamB: { id: leaderboard[4].id, name: leaderboard[4].name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 1: Rank 1 vs Winner of Qualifier
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: leaderboard[0].id, name: leaderboard[0].name },
        teamB: { id: null, name: 'TBD' },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 2: Rank 2 vs Rank 3
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: leaderboard[1].id, name: leaderboard[1].name },
        teamB: { id: leaderboard[2].id, name: leaderboard[2].name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Final: TBD
      knockoutMatches.push({
        id: matchId++,
        phase: 'final',
        teamA: { id: null, name: 'TBD' },
        teamB: { id: null, name: 'TBD' },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
    }
    
    setMatches([...matches, ...knockoutMatches]);
    setPhase('knockout');
  };

  // Auto-advance winners in knockout bracket
  useEffect(() => {
    if (phase !== 'knockout') return;
    
    const knockoutMatches = matches.filter(m => m.phase !== 'group');
    const qualifierMatch = knockoutMatches.find(m => m.phase === 'qualifier');
    const semiMatches = knockoutMatches.filter(m => m.phase === 'semi');
    const finalMatch = knockoutMatches.find(m => m.phase === 'final');
    
    // Handle qualifier completion (5 teams only)
    if (qualifierMatch && qualifierMatch.completed && qualifierMatch.winnerId) {
      const winner = teams.find(t => t.id === qualifierMatch.winnerId);
      const semi1 = semiMatches.find(m => m.teamB.id === null);
      
      if (semi1 && winner) {
        setMatches(prevMatches =>
          prevMatches.map(m =>
            m.id === semi1.id
              ? { ...m, teamB: { id: winner.id, name: winner.name } }
              : m
          )
        );
      }
    }
    
    // Handle semi finals completion
    if (semiMatches.length > 0 && semiMatches.every(m => m.completed) && finalMatch) {
      const semi1Winner = teams.find(t => t.id === semiMatches[0].winnerId);
      const semi2Winner = teams.find(t => t.id === semiMatches[1]?.winnerId);
      
      if (semi1Winner && semi2Winner && finalMatch.teamA.id === null) {
        setMatches(prevMatches =>
          prevMatches.map(m =>
            m.id === finalMatch.id
              ? {
                  ...m,
                  teamA: { id: semi1Winner.id, name: semi1Winner.name },
                  teamB: { id: semi2Winner.id, name: semi2Winner.name }
                }
              : m
          )
        );
      }
    }
    
    // Handle final completion
    if (finalMatch && finalMatch.completed && finalMatch.winnerId) {
      const winner = teams.find(t => t.id === finalMatch.winnerId);
      if (winner) {
        setChampion(winner);
        setPhase('complete');
      }
    }
  }, [matches, teams, phase, numTeams]);

  // Reset tournament
  const resetTournament = () => {
    setPhase('setup');
    setTeams([]);
    setMatches([]);
    setChampion(null);
    setTeamNames(['', '', '', '', '']);
    setError('');
  };

  // Render Setup Screen
  const renderSetup = () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="bg-slate-800 rounded-2xl shadow-2xl p-8 max-w-2xl w-full border border-slate-700">
        <div className="flex items-center justify-center mb-8">
          <Trophy className="text-emerald-500 w-16 h-16 mr-4" />
          <h1 className="text-4xl font-bold text-white">Tournament Manager</h1>
        </div>
        
        <div className="mb-6">
          <label className="block text-emerald-400 font-semibold mb-3 text-lg">
            Number of Teams
          </label>
          <div className="flex gap-4">
            {[3, 4, 5].map(num => (
              <button
                key={num}
                onClick={() => setNumTeams(num)}
                className={`flex-1 py-4 px-6 rounded-xl font-bold text-lg transition-all ${
                  numTeams === num
                    ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/50'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                {num} Teams
              </button>
            ))}
          </div>
        </div>
        
        <div className="mb-6">
          <label className="block text-emerald-400 font-semibold mb-3 text-lg">
            Team Names
          </label>
          <div className="space-y-3">
            {Array.from({ length: numTeams }).map((_, index) => (
              <input
                key={index}
                type="text"
                value={teamNames[index]}
                onChange={(e) => {
                  const newNames = [...teamNames];
                  newNames[index] = e.target.value;
                  setTeamNames(newNames);
                }}
                placeholder={`Team ${index + 1} Name`}
                className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            ))}
          </div>
        </div>
        
        {error && (
          <div className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg flex items-center text-red-400">
            <AlertCircle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}
        
        <button
          onClick={startTournament}
          className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-500/50 hover:shadow-emerald-500/70"
        >
          Start Tournament
        </button>
        
        <div className="mt-8 p-4 bg-slate-700/50 rounded-lg border border-slate-600">
          <h3 className="text-emerald-400 font-semibold mb-2 flex items-center">
            <Target className="w-5 h-5 mr-2" />
            The Accumulator Rules
          </h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>• Winner reaches 21 points → Gets <strong>26 points</strong> (21 + 5 bonus)</li>
            <li>• Loser gets their <strong>exact score</strong> as points</li>
            <li>• Example: 21-19 → Winner +26, Loser +19</li>
            <li>• Total Points determine knockout seeding</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Render Group Stage
  const renderGroupStage = () => {
    const leaderboard = getLeaderboard();
    const groupMatches = matches.filter(m => m.phase === 'group');
    const allComplete = allGroupMatchesComplete();
    
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Users className="text-emerald-500 w-12 h-12 mr-4" />
              <div>
                <h1 className="text-4xl font-bold text-white">Group Stage</h1>
                <p className="text-slate-400">Round Robin - The Accumulator</p>
              </div>
            </div>
            
            {allComplete && (
              <button
                onClick={startKnockout}
                className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/50 flex items-center"
              >
                Start Knockout Stage
                <ChevronRight className="ml-2" />
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Leaderboard */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center">
                <Trophy className="w-6 h-6 mr-2" />
                Leaderboard
              </h2>
              <div className="space-y-2">
                {leaderboard.map((team, index) => (
                  <div
                    key={team.id}
                    className={`p-4 rounded-lg ${
                      index === 0
                        ? 'bg-emerald-900/30 border-2 border-emerald-500'
                        : 'bg-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <span className="text-2xl font-bold text-emerald-400 w-8">
                          #{index + 1}
                        </span>
                        <span className="text-lg font-semibold text-white ml-3">
                          {team.name}
                        </span>
                      </div>
                      <div className="text-right">
                        <div className="text-3xl font-bold text-emerald-400">
                          {team.totalPoints}
                        </div>
                        <div className="text-xs text-slate-400">
                          {team.wins}W - {team.losses}L
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            
            {/* Matches */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">Matches</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {groupMatches.map(match => (
                  <div
                    key={match.id}
                    className={`p-4 rounded-lg border-2 ${
                      match.completed
                        ? 'bg-slate-700/50 border-slate-600'
                        : 'bg-slate-700 border-emerald-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <div className="text-white font-semibold">{match.teamA.name}</div>
                      </div>
                      <div className="text-2xl font-bold text-emerald-400 mx-4">vs</div>
                      <div className="flex-1 text-right">
                        <div className="text-white font-semibold">{match.teamB.name}</div>
                      </div>
                    </div>
                    
                    {!match.completed ? (
                      <>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateScore(match.id, 'A', -1)}
                              className="w-8 h-8 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold"
                            >
                              -
                            </button>
                            <div className="text-4xl font-bold text-white w-16 text-center">
                              {match.scoreA}
                            </div>
                            <button
                              onClick={() => updateScore(match.id, 'A', 1)}
                              className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                            >
                              +
                            </button>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => updateScore(match.id, 'B', -1)}
                              className="w-8 h-8 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold"
                            >
                              -
                            </button>
                            <div className="text-4xl font-bold text-white w-16 text-center">
                              {match.scoreB}
                            </div>
                            <button
                              onClick={() => updateScore(match.id, 'B', 1)}
                              className="w-8 h-8 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
                            >
                              +
                            </button>
                          </div>
                        </div>
                        
                        {(match.scoreA >= 21 || match.scoreB >= 21) && (
                          <button
                            onClick={() => finishMatch(match.id)}
                            className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-lg transition-all flex items-center justify-center"
                          >
                            <Check className="w-5 h-5 mr-2" />
                            Finish Match
                          </button>
                        )}
                      </>
                    ) : (
                      <div className="text-center py-2">
                        <div className="flex items-center justify-center gap-4">
                          <div className={`text-2xl font-bold ${match.winnerId === match.teamA.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {match.scoreA}
                          </div>
                          <div className="text-slate-500">-</div>
                          <div className={`text-2xl font-bold ${match.winnerId === match.teamB.id ? 'text-emerald-400' : 'text-slate-500'}`}>
                            {match.scoreB}
                          </div>
                        </div>
                        <div className="text-emerald-400 text-sm mt-1 flex items-center justify-center">
                          <Check className="w-4 h-4 mr-1" />
                          Completed
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Render Knockout Stage
  const renderKnockout = () => {
    const qualifierMatch = matches.find(m => m.phase === 'qualifier');
    const semiMatches = matches.filter(m => m.phase === 'semi');
    const finalMatch = matches.find(m => m.phase === 'final');
    
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center mb-8">
            <Trophy className="text-emerald-500 w-12 h-12 mr-4" />
            <div>
              <h1 className="text-4xl font-bold text-white">Knockout Stage</h1>
              <p className="text-slate-400">Single Elimination Bracket</p>
            </div>
          </div>
          
          <div className="flex flex-col items-center gap-12">
            {/* Qualifier (5 teams only) */}
            {qualifierMatch && (
              <div className="w-full max-w-md">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4 text-center">
                  Qualifier Match
                </h2>
                {renderKnockoutMatch(qualifierMatch)}
              </div>
            )}
            
            {/* Semi Finals */}
            {semiMatches.length > 0 && (
              <div className="w-full">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4 text-center">
                  Semi Finals
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
                  {semiMatches.map((match, index) => (
                    <div key={match.id}>
                      <div className="text-center text-slate-400 mb-2 font-semibold">
                        Semi Final {index + 1}
                      </div>
                      {renderKnockoutMatch(match)}
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Final */}
            {finalMatch && (
              <div className="w-full max-w-md">
                <h2 className="text-3xl font-bold text-emerald-400 mb-4 text-center flex items-center justify-center">
                  <Trophy className="w-8 h-8 mr-2" />
                  Grand Final
                </h2>
                {renderKnockoutMatch(finalMatch)}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render individual knockout match
  const renderKnockoutMatch = (match) => (
    <div
      className={`p-6 rounded-2xl border-2 ${
        match.completed
          ? 'bg-slate-800 border-slate-600'
          : 'bg-slate-800 border-emerald-500'
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex-1">
          <div className={`font-semibold text-lg ${match.teamA.id ? 'text-white' : 'text-slate-500'}`}>
            {match.teamA.name}
          </div>
        </div>
        <div className="text-xl font-bold text-emerald-400 mx-4">vs</div>
        <div className="flex-1 text-right">
          <div className={`font-semibold text-lg ${match.teamB.id ? 'text-white' : 'text-slate-500'}`}>
            {match.teamB.name}
          </div>
        </div>
      </div>
      
      {match.teamA.id && match.teamB.id && !match.completed && (
        <>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateScore(match.id, 'A', -1)}
                className="w-10 h-10 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold"
              >
                -
              </button>
              <div className="text-5xl font-bold text-white w-20 text-center">
                {match.scoreA}
              </div>
              <button
                onClick={() => updateScore(match.id, 'A', 1)}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                +
              </button>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => updateScore(match.id, 'B', -1)}
                className="w-10 h-10 bg-slate-600 hover:bg-slate-500 text-white rounded-lg font-bold"
              >
                -
              </button>
              <div className="text-5xl font-bold text-white w-20 text-center">
                {match.scoreB}
              </div>
              <button
                onClick={() => updateScore(match.id, 'B', 1)}
                className="w-10 h-10 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                +
              </button>
            </div>
          </div>
          
          {(match.scoreA >= 21 || match.scoreB >= 21) && (
            <button
              onClick={() => finishMatch(match.id)}
              className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all flex items-center justify-center"
            >
              <Check className="w-5 h-5 mr-2" />
              Finish Match
            </button>
          )}
        </>
      )}
      
      {match.completed && (
        <div className="text-center py-3">
          <div className="flex items-center justify-center gap-6">
            <div className={`text-4xl font-bold ${match.winnerId === match.teamA.id ? 'text-emerald-400' : 'text-slate-500'}`}>
              {match.scoreA}
            </div>
            <div className="text-slate-500 text-2xl">-</div>
            <div className={`text-4xl font-bold ${match.winnerId === match.teamB.id ? 'text-emerald-400' : 'text-slate-500'}`}>
              {match.scoreB}
            </div>
          </div>
          <div className="text-emerald-400 mt-2 flex items-center justify-center">
            <Check className="w-5 h-5 mr-1" />
            Completed
          </div>
        </div>
      )}
      
      {match.teamA.id === null && (
        <div className="text-center py-4 text-slate-500">
          Awaiting previous match results...
        </div>
      )}
    </div>
  );

  // Render Champion Screen
  const renderComplete = () => (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-8">
      <div className="text-center">
        <div className="mb-8 animate-bounce">
          <Award className="text-yellow-400 w-32 h-32 mx-auto drop-shadow-[0_0_30px_rgba(250,204,21,0.6)]" />
        </div>
        
        <h1 className="text-6xl font-bold text-white mb-4">
          🏆 CHAMPION! 🏆
        </h1>
        
        <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 text-slate-900 text-5xl font-bold py-6 px-12 rounded-2xl mb-8 shadow-2xl shadow-yellow-500/50">
          {champion?.name}
        </div>
        
        <div className="bg-slate-800 rounded-2xl p-8 max-w-2xl mx-auto border border-slate-700 mb-8">
          <h2 className="text-2xl font-bold text-emerald-400 mb-6">Final Standings</h2>
          <div className="space-y-3">
            {getLeaderboard().map((team, index) => (
              <div
                key={team.id}
                className={`p-4 rounded-lg ${
                  team.id === champion?.id
                    ? 'bg-yellow-900/30 border-2 border-yellow-500'
                    : 'bg-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`text-2xl font-bold w-12 ${
                      team.id === champion?.id ? 'text-yellow-400' : 'text-slate-400'
                    }`}>
                      #{index + 1}
                    </span>
                    <span className="text-xl font-semibold text-white">
                      {team.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-emerald-400">
                      {team.totalPoints} pts
                    </div>
                    <div className="text-sm text-slate-400">
                      {team.wins}W - {team.losses}L
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <button
          onClick={resetTournament}
          className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-500/50"
        >
          Start New Tournament
        </button>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="font-sans">
      {phase === 'setup' && renderSetup()}
      {phase === 'group' && renderGroupStage()}
      {phase === 'knockout' && renderKnockout()}
      {phase === 'complete' && renderComplete()}
    </div>
  );
};

export default TournamentManager;
