import React, { useState, useEffect } from 'react';
import { Trophy, AlertCircle, Check, ChevronRight, Award, Users, Target } from 'lucide-react';

const TournamentManager = () => {
  // Phase management
  const [phase, setPhase] = useState('setup'); // 'setup' | 'round1' | 'round2' | 'final' | 'complete'
  const [currentRound, setCurrentRound] = useState(1);
  const [numTeams, setNumTeams] = useState(6);
  
  // Core data
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [champion, setChampion] = useState(null);
  const [eliminatedTeams, setEliminatedTeams] = useState([]);
  
  // UI state
  const [teamNames, setTeamNames] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [showGroupConfig, setShowGroupConfig] = useState(false);
  const [groupConfigOptions, setGroupConfigOptions] = useState([]);

  // Generate Round Robin matches for Group Stage (divided into two groups)
  const generateGroupMatches = (teamsList, round) => {
    const groupMatches = [];
    let matchId = matches.length + 1;
    
    // Divide teams into two groups
    const midPoint = Math.ceil(teamsList.length / 2);
    const groupA = teamsList.slice(0, midPoint);
    const groupB = teamsList.slice(midPoint);
    
    // Generate matches within Group A
    for (let i = 0; i < groupA.length; i++) {
      for (let j = i + 1; j < groupA.length; j++) {
        groupMatches.push({
          id: matchId++,
          phase: `round${round}`,
          round: round,
          group: 'A',
          teamA: { id: groupA[i].id, name: groupA[i].name },
          teamB: { id: groupA[j].id, name: groupA[j].name },
          scoreA: 0,
          scoreB: 0,
          winnerId: null,
          completed: false
        });
      }
    }
    
    // Generate matches within Group B
    for (let i = 0; i < groupB.length; i++) {
      for (let j = i + 1; j < groupB.length; j++) {
        groupMatches.push({
          id: matchId++,
          phase: `round${round}`,
          round: round,
          group: 'B',
          teamA: { id: groupB[i].id, name: groupB[i].name },
          teamB: { id: groupB[j].id, name: groupB[j].name },
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
    setCurrentRound(1);
    setPhase('round1');
    
    // Show group configuration modal for Round 1
    const options = calculateGroupOptions(initialTeams.length);
    setGroupConfigOptions(options);
    setShowGroupConfig(true);
  };

  // Update match score
  const updateScore = (matchId, team, newScore) => {
    setMatches(prevMatches => 
      prevMatches.map(match => {
        if (match.id === matchId && !match.completed) {
          const newMatch = { ...match };
          
          if (team === 'A') {
            newMatch.scoreA = Math.max(0, Math.min(30, newScore));
          } else {
            newMatch.scoreB = Math.max(0, Math.min(30, newScore));
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
      
      // Update teams with point difference scoring
      const pointDifference = Math.abs(match.scoreA - match.scoreB);
      
      setTeams(prevTeams => 
        prevTeams.map(team => {
          if (team.id === match.teamA.id) {
            const isWinner = winnerId === team.id;
            const tpgChange = isWinner ? pointDifference : -pointDifference;
            return {
              ...team,
              matchesPlayed: team.matchesPlayed + 1,
              wins: isWinner ? team.wins + 1 : team.wins,
              losses: !isWinner ? team.losses + 1 : team.losses,
              totalPoints: team.totalPoints + tpgChange
            };
          } else if (team.id === match.teamB.id) {
            const isWinner = winnerId === team.id;
            const tpgChange = isWinner ? pointDifference : -pointDifference;
            return {
              ...team,
              matchesPlayed: team.matchesPlayed + 1,
              wins: isWinner ? team.wins + 1 : team.wins,
              losses: !isWinner ? team.losses + 1 : team.losses,
              totalPoints: team.totalPoints + tpgChange
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

  // Check if all current round matches are complete
  const allRoundMatchesComplete = () => {
    const roundMatches = matches.filter(m => m.round === currentRound);
    return roundMatches.length > 0 && roundMatches.every(m => m.completed);
  };
  
  // Get teams that played in current round
  const getCurrentRoundTeams = () => {
    const roundMatches = matches.filter(m => m.round === currentRound);
    const teamIds = new Set();
    roundMatches.forEach(m => {
      teamIds.add(m.teamA.id);
      teamIds.add(m.teamB.id);
    });
    return teams.filter(t => teamIds.has(t.id));
  };

  // Get group standings for current round
  const getGroupStandings = (group, round = currentRound) => {
    const groupTeamIds = new Set();
    matches.filter(m => m.round === round && m.group === group).forEach(m => {
      groupTeamIds.add(m.teamA.id);
      groupTeamIds.add(m.teamB.id);
    });
    
    return teams
      .filter(t => groupTeamIds.has(t.id) && !eliminatedTeams.includes(t.id))
      .sort((a, b) => b.totalPoints - a.totalPoints);
  };

  // Calculate possible group configurations
  const calculateGroupOptions = (numQualified) => {
    const options = [];
    
    // Option 1: All teams in 2 equal groups (if even number)
    if (numQualified % 2 === 0 && numQualified >= 2) {
      const groupSize = numQualified / 2;
      options.push({
        id: 'split-even',
        name: `2 Groups of ${groupSize}`,
        description: `Split ${numQualified} teams into 2 equal groups`,
        groupCount: 2,
        groupSizes: [groupSize, groupSize]
      });
    }
    
    // Option 2: One large group (if <= 6 teams)
    if (numQualified <= 6 && numQualified >= 3) {
      options.push({
        id: 'single-group',
        name: `1 Group of ${numQualified}`,
        description: `All ${numQualified} teams play in a single group`,
        groupCount: 1,
        groupSizes: [numQualified]
      });
    }
    
    // Option 3: Uneven split (for odd numbers)
    if (numQualified >= 3 && numQualified % 2 !== 0) {
      const group1Size = Math.ceil(numQualified / 2);
      const group2Size = Math.floor(numQualified / 2);
      options.push({
        id: 'split-uneven',
        name: `Group A (${group1Size}) vs Group B (${group2Size})`,
        description: `Split into uneven groups`,
        groupCount: 2,
        groupSizes: [group1Size, group2Size]
      });
    }
    
    return options;
  };

  // Show group configuration modal
  const showGroupConfigModal = () => {
    let numQualified;
    
    // For initial Round 1 setup, use total teams
    if (currentRound === 1 && matches.length === 0) {
      numQualified = teams.length;
      const options = calculateGroupOptions(numQualified);
      setGroupConfigOptions(options);
      setShowGroupConfig(true);
      return;
    }
    
    // For subsequent rounds, calculate qualified teams dynamically
    const roundMatches = matches.filter(m => m.round === currentRound);
    const hasGroupB = roundMatches.some(m => m.group === 'B');
    const groupAStandings = getGroupStandings('A');
    const groupBStandings = getGroupStandings('B');
    
    if (hasGroupB) {
      // Two groups - qualify top teams from each (half of total)
      const totalInRound = groupAStandings.length + groupBStandings.length;
      const qualifyPerGroup = Math.ceil(totalInRound / 4); // Aim for ~half to qualify
      numQualified = qualifyPerGroup * 2;
    } else {
      // Single group - qualify top half
      numQualified = Math.ceil(groupAStandings.length / 2);
    }
    
    // Minimum 2 teams for final
    numQualified = Math.max(2, numQualified);
    
    // If only 2 teams will qualify, skip modal and go directly to final
    if (numQualified === 2) {
      advanceToNextRound('skip-to-final');
      return;
    }
    
    const options = calculateGroupOptions(numQualified);
    setGroupConfigOptions(options);
    setShowGroupConfig(true);
  };

  // Advance to next round with chosen configuration
  const advanceToNextRound = (configId = null) => {
    // Handle initial Round 1 setup
    if (currentRound === 1 && matches.length === 0) {
      const activeTeams = teams.filter(t => !eliminatedTeams.includes(t.id));
      
      if (!configId) {
        setShowGroupConfig(false);
        return;
      }
      
      let newMatches;
      if (configId === 'single-group') {
        newMatches = generateSingleGroupMatches(activeTeams, 1);
      } else {
        newMatches = generateGroupMatches(activeTeams, 1);
      }
      
      setMatches(newMatches);
      setShowGroupConfig(false);
      return;
    }
    
    // Get qualified teams from current round
    const roundMatches = matches.filter(m => m.round === currentRound);
    const hasGroupB = roundMatches.some(m => m.group === 'B');
    const groupAStandings = getGroupStandings('A');
    const groupBStandings = getGroupStandings('B');
    
    // Determine how many qualify dynamically based on team count
    let qualifyPerGroup;
    if (hasGroupB) {
      // Two groups - calculate qualification dynamically
      const totalInRound = groupAStandings.length + groupBStandings.length;
      if (totalInRound <= 4) {
        qualifyPerGroup = 1; // Top 1 from each (finals)
      } else {
        qualifyPerGroup = Math.ceil(groupAStandings.length / 2); // Top half from each group
      }
    } else {
      // Single group - top half qualifies
      qualifyPerGroup = Math.ceil(groupAStandings.length / 2);
    }
    
    const qualifiedFromA = groupAStandings.slice(0, qualifyPerGroup);
    const qualifiedFromB = hasGroupB ? groupBStandings.slice(0, qualifyPerGroup) : [];
    const eliminatedFromA = groupAStandings.slice(qualifyPerGroup);
    const eliminatedFromB = hasGroupB ? groupBStandings.slice(qualifyPerGroup) : [];
    
    // Mark eliminated teams
    const newEliminated = [
      ...eliminatedTeams,
      ...eliminatedFromA.map(t => t.id),
      ...eliminatedFromB.map(t => t.id)
    ];
    setEliminatedTeams(newEliminated);
    
    // Reset TPG for qualified teams
    setTeams(prevTeams =>
      prevTeams.map(team => {
        if (newEliminated.includes(team.id)) return team;
        return {
          ...team,
          totalPoints: 0,
          wins: 0,
          losses: 0,
          matchesPlayed: 0
        };
      })
    );
    
    const qualifiedTeams = [...qualifiedFromA, ...qualifiedFromB];
    
    // Check if we should go to final or another round
    if (qualifiedTeams.length === 2) {
      // Only 2 teams left - create final match
      const finalMatch = {
        id: matches.length + 1,
        phase: 'final',
        round: currentRound + 1,
        teamA: { id: qualifiedTeams[0].id, name: qualifiedTeams[0].name },
        teamB: { id: qualifiedTeams[1].id, name: qualifiedTeams[1].name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      };
      
      setMatches([...matches, finalMatch]);
      setCurrentRound(currentRound + 1);
      setPhase('final');
      setShowGroupConfig(false);
    } else if (qualifiedTeams.length > 2) {
      // More than 2 teams - continue with another round
      if (!configId) {
        configId = 'split-even'; // Default
      }
      
      let newMatches;
      if (configId === 'single-group') {
        newMatches = generateSingleGroupMatches(qualifiedTeams, currentRound + 1);
      } else {
        newMatches = generateGroupMatches(qualifiedTeams, currentRound + 1);
      }
      
      setMatches([...matches, ...newMatches]);
      setCurrentRound(currentRound + 1);
      
      // Determine phase based on round number
      if (currentRound === 1) {
        setPhase('round2');
      } else {
        setPhase('round2'); // Keep as round2 for any additional rounds
      }
      
      setShowGroupConfig(false);
    }
  };

  // Generate matches for single group (all teams play each other)
  const generateSingleGroupMatches = (teamsList, round) => {
    const groupMatches = [];
    let matchId = matches.length + 1;
    
    // All teams play against each other in one group
    for (let i = 0; i < teamsList.length; i++) {
      for (let j = i + 1; j < teamsList.length; j++) {
        groupMatches.push({
          id: matchId++,
          phase: `round${round}`,
          round: round,
          group: 'A', // All in group A
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

  // Old knockout function (keeping structure for compatibility)
  const startKnockout = () => {
    advanceToNextRound();
  };

  const generateKnockoutBracket_OLD = () => {
    const groupAStandings = getGroupStandings('A');
    const groupBStandings = getGroupStandings('B');
    const knockoutMatches = [];
    let matchId = matches.length + 1;
    
    // For all configurations: Top teams from each group advance
    if (numTeams === 3) {
      // Group A: 2 teams, Group B: 1 team
      // Final: A1 vs A2 (B has only 1 team, eliminated)
      knockoutMatches.push({
        id: matchId++,
        phase: 'final',
        teamA: { id: groupAStandings[0]?.id, name: groupAStandings[0]?.name },
        teamB: { id: groupAStandings[1]?.id, name: groupAStandings[1]?.name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
    } else if (numTeams === 4) {
      // Group A: 2 teams, Group B: 2 teams
      // Semi 1: A1 vs B2
      // Semi 2: B1 vs A2
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: groupAStandings[0]?.id, name: groupAStandings[0]?.name },
        teamB: { id: groupBStandings[1]?.id, name: groupBStandings[1]?.name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: groupBStandings[0]?.id, name: groupBStandings[0]?.name },
        teamB: { id: groupAStandings[1]?.id, name: groupAStandings[1]?.name },
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
      // Group A: 3 teams, Group B: 2 teams
      // Qualifier: A3 vs B2 (3rd from A vs 2nd from B)
      knockoutMatches.push({
        id: matchId++,
        phase: 'qualifier',
        teamA: { id: groupAStandings[2]?.id, name: groupAStandings[2]?.name },
        teamB: { id: groupBStandings[1]?.id, name: groupBStandings[1]?.name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 1: A1 vs Winner of Qualifier
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: groupAStandings[0]?.id, name: groupAStandings[0]?.name },
        teamB: { id: null, name: 'TBD' },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 2: B1 vs A2
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: groupBStandings[0]?.id, name: groupBStandings[0]?.name },
        teamB: { id: groupAStandings[1]?.id, name: groupAStandings[1]?.name },
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
    } else if (numTeams === 6) {
      // Group A: 3 teams, Group B: 3 teams
      // Qualifier 1: A2 vs B3
      knockoutMatches.push({
        id: matchId++,
        phase: 'qualifier',
        teamA: { id: groupAStandings[1]?.id, name: groupAStandings[1]?.name },
        teamB: { id: groupBStandings[2]?.id, name: groupBStandings[2]?.name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Qualifier 2: B2 vs A3
      knockoutMatches.push({
        id: matchId++,
        phase: 'qualifier',
        teamA: { id: groupBStandings[1]?.id, name: groupBStandings[1]?.name },
        teamB: { id: groupAStandings[2]?.id, name: groupAStandings[2]?.name },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 1: A1 vs Winner of Qualifier 2
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: groupAStandings[0]?.id, name: groupAStandings[0]?.name },
        teamB: { id: null, name: 'TBD' },
        scoreA: 0,
        scoreB: 0,
        winnerId: null,
        completed: false
      });
      
      // Semi 2: B1 vs Winner of Qualifier 1
      knockoutMatches.push({
        id: matchId++,
        phase: 'semi',
        teamA: { id: groupBStandings[0]?.id, name: groupBStandings[0]?.name },
        teamB: { id: null, name: 'TBD' },
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
    setPhase('knockout_old');
  };

  // Check if final is complete
  useEffect(() => {
    if (phase === 'final') {
      const finalMatch = matches.find(m => m.phase === 'final');
      if (finalMatch && finalMatch.completed && finalMatch.winnerId) {
        const winner = teams.find(t => t.id === finalMatch.winnerId);
        if (winner) {
          setChampion(winner);
          setPhase('complete');
        }
      }
    }
  }, [matches, teams, phase]);

  // Auto-advance winners in knockout bracket (OLD)
  useEffect(() => {
    if (phase !== 'knockout_old') return;
    
    const knockoutMatches = matches.filter(m => m.phase !== 'group');
    const qualifierMatches = knockoutMatches.filter(m => m.phase === 'qualifier');
    const semiMatches = knockoutMatches.filter(m => m.phase === 'semi');
    const finalMatch = knockoutMatches.find(m => m.phase === 'final');
    
    // Handle qualifier completion
    if (numTeams === 5) {
      // 5 teams: 1 qualifier match
      const qualifierMatch = qualifierMatches[0];
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
    } else if (numTeams === 6) {
      // 6 teams: 2 qualifier matches
      if (qualifierMatches.every(q => q.completed && q.winnerId)) {
        const qualifier1Winner = teams.find(t => t.id === qualifierMatches[0].winnerId); // 3v6 winner
        const qualifier2Winner = teams.find(t => t.id === qualifierMatches[1].winnerId); // 4v5 winner
        
        // Semi 1: Rank 1 vs Winner of 4v5
        // Semi 2: Rank 2 vs Winner of 3v6
        const semi1 = semiMatches[0]; // Should have Rank 1 and needs 4v5 winner
        const semi2 = semiMatches[1]; // Should have Rank 2 and needs 3v6 winner
        
        if (semi1 && semi2 && qualifier1Winner && qualifier2Winner) {
          setMatches(prevMatches =>
            prevMatches.map(m => {
              if (m.id === semi1.id && m.teamB.id === null) {
                return { ...m, teamB: { id: qualifier2Winner.id, name: qualifier2Winner.name } };
              } else if (m.id === semi2.id && m.teamB.id === null) {
                return { ...m, teamB: { id: qualifier1Winner.id, name: qualifier1Winner.name } };
              }
              return m;
            })
          );
        }
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
    
    // Handle final completion (OLD)
    if (finalMatch && finalMatch.completed && finalMatch.winnerId) {
      const winner = teams.find(t => t.id === finalMatch.winnerId);
      if (winner) {
        setChampion(winner);
        setPhase('complete');
      }
    }
  }, [matches, teams, phase]);

  // Reset tournament
  const resetTournament = () => {
    setPhase('setup');
    setCurrentRound(1);
    setTeams([]);
    setMatches([]);
    setChampion(null);
    setEliminatedTeams([]);
    setTeamNames(['', '', '', '', '', '']);
    setError('');
  };

  // Download matches and scores as CSV
  const downloadScoresCSV = () => {
    if (matches.length === 0) {
      alert('No match data to download yet!');
      return;
    }

    // CSV header
    let csv = 'Round,Phase,Group,Team A,Score A,Team B,Score B,Winner,Status\n';

    // Add all matches
    matches.forEach(match => {
      const winner = match.winnerId 
        ? teams.find(t => t.id === match.winnerId)?.name || 'TBD'
        : match.completed ? 'Draw' : 'Pending';
      
      csv += `${match.round || ''},`;
      csv += `${match.phase || ''},`;
      csv += `${match.group || ''},`;
      csv += `"${match.teamA.name}",`;
      csv += `${match.scoreA},`;
      csv += `"${match.teamB.name}",`;
      csv += `${match.scoreB},`;
      csv += `"${winner}",`;
      csv += `${match.completed ? 'Completed' : 'Pending'}\n`;
    });

    // Add team standings if available
    if (teams.length > 0 && phase !== 'setup') {
      csv += '\n\nTeam Standings\n';
      csv += 'Team,Total Points,Wins,Losses,Status\n';
      teams.forEach(team => {
        const status = eliminatedTeams.includes(team.id) ? 'Eliminated' : 
                      champion?.id === team.id ? 'Champion' : 'Active';
        csv += `"${team.name}",${team.totalPoints},${team.wins},${team.losses},${status}\n`;
      });
    }

    // Create download
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `tournament_scores_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
          <div className="grid grid-cols-2 gap-4">
            {[3, 4, 5, 6].map(num => (
              <button
                key={num}
                onClick={() => setNumTeams(num)}
                className={`py-4 px-6 rounded-xl font-bold text-lg transition-all ${
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
            TPG Scoring Rules
          </h3>
          <ul className="text-slate-300 text-sm space-y-1">
            <li>• Winner gets <strong>+Point Difference</strong></li>
            <li>• Loser gets <strong>-Point Difference</strong></li>
            <li>• Example: 21-18 → Winner: +3, Loser: -3</li>
            <li>• Highest Net TPG qualifies for knockout stage</li>
          </ul>
        </div>
      </div>
    </div>
  );

  // Render Group Stage (any round)
  const renderGroupStage = () => {
    const roundMatches = matches.filter(m => m.round === currentRound);
    
    // If no matches yet, show waiting message (configuration modal should be open)
    if (roundMatches.length === 0) {
      return (
        <div className="min-h-screen bg-slate-900 p-8 flex items-center justify-center">
          <div className="text-center">
            <Users className="text-emerald-500 w-24 h-24 mx-auto mb-4" />
            <h2 className="text-3xl font-bold text-white mb-2">Configuring Round {currentRound}</h2>
            <p className="text-slate-400">Please select group configuration...</p>
          </div>
        </div>
      );
    }
    
    const allComplete = allRoundMatchesComplete();
    const groupAStandings = getGroupStandings('A');
    const groupBStandings = getGroupStandings('B');
    const hasGroupB = roundMatches.some(m => m.group === 'B');
    
    // Determine how many qualify from each group dynamically
    let qualifyCountPerGroup;
    if (hasGroupB) {
      // Two groups - qualify top half from each
      qualifyCountPerGroup = Math.ceil(groupAStandings.length / 2);
    } else {
      // Single group - qualify top half
      qualifyCountPerGroup = Math.ceil(groupAStandings.length / 2);
    }
    
    // If we're close to finals, ensure we only take enough for next round
    const totalInRound = groupAStandings.length + (hasGroupB ? groupBStandings.length : 0);
    if (totalInRound <= 4) {
      qualifyCountPerGroup = hasGroupB ? 1 : 2; // Finals approach
    }
    
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <Users className="text-emerald-500 w-12 h-12 mr-4" />
              <div>
                <h1 className="text-4xl font-bold text-white">Round {currentRound}</h1>
                <p className="text-slate-400">
                  {totalInRound === 2 
                    ? 'Championship Final'
                    : !hasGroupB 
                    ? `Single Group - Top ${qualifyCountPerGroup} advance`
                    : `Top ${qualifyCountPerGroup} from each group advance`
                  }
                </p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={downloadScoresCSV}
                className="px-6 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold rounded-xl transition-all flex items-center gap-2"
                title="Download scores as CSV"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Download CSV
              </button>
              {allComplete && (
                <button
                  onClick={showGroupConfigModal}
                  className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/50 flex items-center"
                >
                {currentRound === 1 && 'Choose Group Configuration for Round 2'}
                {currentRound === 2 && 'Choose Group Configuration for Final'}
                <ChevronRight className="ml-2" />
              </button>
              )}
            </div>
          </div>
          
          {/* Group Standings */}
          <div className={`grid grid-cols-1 ${hasGroupB ? 'md:grid-cols-2' : ''} gap-6 mb-8`}>
            {/* Group A */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center">
                <Users className="w-6 h-6 mr-2" />
                {hasGroupB ? 'Group A' : 'All Teams'}
              </h2>
              <div className="space-y-2">
                {groupAStandings.map((team, index) => {
                  const isQualified = index < qualifyCountPerGroup;
                  const isGroupChampion = index === 0;
                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-lg ${
                        isGroupChampion
                          ? 'bg-emerald-900/30 border-2 border-emerald-500'
                          : isQualified
                          ? 'bg-emerald-900/10 border-2 border-emerald-700'
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
                          {allComplete && (
                            <span className={`ml-3 text-xs px-2 py-1 rounded ${
                              isGroupChampion ? 'bg-yellow-600 text-white' :
                              isQualified ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {isGroupChampion ? 'GC' : isQualified ? 'Q' : 'E'}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-emerald-400">
                            {team.totalPoints > 0 ? '+' : ''}{team.totalPoints}
                          </div>
                          <div className="text-xs text-slate-400">
                            {team.wins}W-{team.losses}L
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            
            {/* Group B - Only show if it exists */}
            {hasGroupB && (
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center">
                  <Users className="w-6 h-6 mr-2" />
                  Group B
                </h2>
              <div className="space-y-2">
                {groupBStandings.map((team, index) => {
                  const isQualified = index < qualifyCountPerGroup;
                  const isGroupChampion = index === 0;
                  return (
                    <div
                      key={team.id}
                      className={`p-4 rounded-lg ${
                        isGroupChampion
                          ? 'bg-emerald-900/30 border-2 border-emerald-500'
                          : isQualified
                          ? 'bg-emerald-900/10 border-2 border-emerald-700'
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
                          {allComplete && (
                            <span className={`ml-3 text-xs px-2 py-1 rounded ${
                              isGroupChampion ? 'bg-yellow-600 text-white' :
                              isQualified ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
                            }`}>
                              {isGroupChampion ? 'GC' : isQualified ? 'Q' : 'E'}
                            </span>
                          )}
                        </div>
                        <div className="text-right">
                          <div className="text-3xl font-bold text-emerald-400">
                            {team.totalPoints > 0 ? '+' : ''}{team.totalPoints}
                          </div>
                          <div className="text-xs text-slate-400">
                            {team.wins}W-{team.losses}L
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}
          </div>
          
          {/* Match Results Matrix */}
          <div className={`grid grid-cols-1 ${hasGroupB ? 'lg:grid-cols-2' : ''} gap-6 mb-8`}>
            {/* Group A Matrix */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center">
                <Target className="w-6 h-6 mr-2" />
                {hasGroupB ? 'Group A Results' : 'Match Results'}
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-slate-400 text-xs font-semibold border border-slate-700 bg-slate-900">Team</th>
                      {getGroupStandings('A').map((team) => (
                        <th key={team.id} className="p-2 text-emerald-400 text-xs font-semibold border border-slate-700 text-center bg-slate-900">
                          {team.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupStandings('A').map((rowTeam) => (
                      <tr key={rowTeam.id}>
                        <td className="p-2 text-emerald-400 text-xs font-semibold border border-slate-700 bg-slate-900">
                          {rowTeam.name}
                        </td>
                        {getGroupStandings('A').map((colTeam) => {
                          if (rowTeam.id === colTeam.id) {
                            return (
                              <td key={colTeam.id} className="p-3 border border-slate-700 bg-slate-700">
                                <div className="text-center text-slate-500 text-xl">✕</div>
                              </td>
                            );
                          }
                          
                          const match = roundMatches.find(
                            m => m.group === 'A' && (
                              (m.teamA.id === rowTeam.id && m.teamB.id === colTeam.id) ||
                              (m.teamA.id === colTeam.id && m.teamB.id === rowTeam.id)
                            )
                          );
                          
                          if (!match) {
                            return (
                              <td key={colTeam.id} className="p-3 border border-slate-700 bg-slate-700">
                                <div className="text-center text-slate-500">—</div>
                              </td>
                            );
                          }
                          
                          const isTeamA = match.teamA.id === rowTeam.id;
                          const myScore = isTeamA ? match.scoreA : match.scoreB;
                          const opponentScore = isTeamA ? match.scoreB : match.scoreA;
                          const isWinner = match.completed && match.winnerId === rowTeam.id;
                          const isLoser = match.completed && match.winnerId !== rowTeam.id;
                          
                          return (
                            <td 
                              key={colTeam.id} 
                              className={`p-3 border-2 ${
                                !match.completed ? 'bg-slate-700 border-slate-600' :
                                isWinner ? 'bg-emerald-600 border-emerald-500' :
                                isLoser ? 'bg-red-600 border-red-500' : 'bg-slate-700 border-slate-600'
                              }`}
                            >
                              {match.completed ? (
                                <div className="text-center">
                                  <div className="text-white font-bold text-lg">
                                    {myScore}
                                  </div>
                                  <div className="text-white/70 text-xs">
                                    {isWinner ? 'WIN' : 'LOSS'}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-sm">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                    <span>Won</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>Lost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-700 rounded"></div>
                    <span>Pending</span>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Group B Matrix - Only show if it exists */}
            {hasGroupB && (
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center">
                  <Target className="w-6 h-6 mr-2" />
                  Group B Results
                </h2>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="p-2 text-slate-400 text-xs font-semibold border border-slate-700 bg-slate-900">Team</th>
                      {getGroupStandings('B').map((team) => (
                        <th key={team.id} className="p-2 text-emerald-400 text-xs font-semibold border border-slate-700 text-center bg-slate-900">
                          {team.name}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {getGroupStandings('B').map((rowTeam) => (
                      <tr key={rowTeam.id}>
                        <td className="p-2 text-emerald-400 text-xs font-semibold border border-slate-700 bg-slate-900">
                          {rowTeam.name}
                        </td>
                        {getGroupStandings('B').map((colTeam) => {
                          if (rowTeam.id === colTeam.id) {
                            return (
                              <td key={colTeam.id} className="p-3 border border-slate-700 bg-slate-700">
                                <div className="text-center text-slate-500 text-xl">✕</div>
                              </td>
                            );
                          }
                          
                          const match = roundMatches.find(
                            m => m.group === 'B' && (
                              (m.teamA.id === rowTeam.id && m.teamB.id === colTeam.id) ||
                              (m.teamA.id === colTeam.id && m.teamB.id === rowTeam.id)
                            )
                          );
                          
                          if (!match) {
                            return (
                              <td key={colTeam.id} className="p-3 border border-slate-700 bg-slate-700">
                                <div className="text-center text-slate-500">—</div>
                              </td>
                            );
                          }
                          
                          const isTeamA = match.teamA.id === rowTeam.id;
                          const myScore = isTeamA ? match.scoreA : match.scoreB;
                          const opponentScore = isTeamA ? match.scoreB : match.scoreA;
                          const isWinner = match.completed && match.winnerId === rowTeam.id;
                          const isLoser = match.completed && match.winnerId !== rowTeam.id;
                          
                          return (
                            <td 
                              key={colTeam.id} 
                              className={`p-3 border-2 ${
                                !match.completed ? 'bg-slate-700 border-slate-600' :
                                isWinner ? 'bg-emerald-600 border-emerald-500' :
                                isLoser ? 'bg-red-600 border-red-500' : 'bg-slate-700 border-slate-600'
                              }`}
                            >
                              {match.completed ? (
                                <div className="text-center">
                                  <div className="text-white font-bold text-lg">
                                    {myScore}
                                  </div>
                                  <div className="text-white/70 text-xs">
                                    {isWinner ? 'WIN' : 'LOSS'}
                                  </div>
                                </div>
                              ) : (
                                <div className="text-center text-slate-400 text-sm">—</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 text-xs text-slate-400">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-emerald-600 rounded"></div>
                    <span>Won</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-red-600 rounded"></div>
                    <span>Lost</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-slate-700 rounded"></div>
                    <span>Pending</span>
                  </div>
                </div>
              </div>
            </div>
            )}
          </div>
          
          <div className={`grid grid-cols-1 ${hasGroupB ? 'lg:grid-cols-2' : ''} gap-8`}>
            {/* Group A Matches */}
            <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
              <h2 className="text-2xl font-bold text-emerald-400 mb-4">
                {hasGroupB ? 'Group A Matches' : 'All Matches'}
              </h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {roundMatches.filter(m => m.group === 'A').map(match => (
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
                        <div className="grid grid-cols-3 gap-3 mb-3 items-center">
                          <div className="text-center">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={match.scoreA}
                              onChange={(e) => updateScore(match.id, 'A', parseInt(e.target.value) || 0)}
                              className="w-full text-4xl font-bold text-center bg-slate-600 text-white rounded-lg py-3 px-2 border-2 border-slate-500 focus:border-emerald-500 focus:outline-none"
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="text-2xl font-bold text-emerald-400 text-center">
                            /
                          </div>
                          
                          <div className="text-center">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={match.scoreB}
                              onChange={(e) => updateScore(match.id, 'B', parseInt(e.target.value) || 0)}
                              className="w-full text-4xl font-bold text-center bg-slate-600 text-white rounded-lg py-3 px-2 border-2 border-slate-500 focus:border-emerald-500 focus:outline-none"
                              placeholder="0"
                            />
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
            
            {/* Group B Matches - Only show if it exists */}
            {hasGroupB && (
              <div className="bg-slate-800 rounded-2xl p-6 border border-slate-700">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4">Group B Matches</h2>
              <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                {roundMatches.filter(m => m.group === 'B').map(match => (
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
                        <div className="grid grid-cols-3 gap-3 mb-3 items-center">
                          <div className="text-center">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={match.scoreA}
                              onChange={(e) => updateScore(match.id, 'A', parseInt(e.target.value) || 0)}
                              className="w-full text-4xl font-bold text-center bg-slate-600 text-white rounded-lg py-3 px-2 border-2 border-slate-500 focus:border-emerald-500 focus:outline-none"
                              placeholder="0"
                            />
                          </div>
                          
                          <div className="text-2xl font-bold text-emerald-400 text-center">
                            /
                          </div>
                          
                          <div className="text-center">
                            <input
                              type="number"
                              min="0"
                              max="30"
                              value={match.scoreB}
                              onChange={(e) => updateScore(match.id, 'B', parseInt(e.target.value) || 0)}
                              className="w-full text-4xl font-bold text-center bg-slate-600 text-white rounded-lg py-3 px-2 border-2 border-slate-500 focus:border-emerald-500 focus:outline-none"
                              placeholder="0"
                            />
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
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Final Match
  const renderFinal = () => {
    const finalMatch = matches.find(m => m.phase === 'final');
    
    if (!finalMatch) return null;
    
    return (
      <div className="min-h-screen bg-slate-900 p-8">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center flex-1 justify-center">
              <Trophy className="text-yellow-400 w-16 h-16 mr-4" />
              <div className="text-center">
                <h1 className="text-5xl font-bold text-white">FINAL MATCH</h1>
                <p className="text-slate-400 mt-2">Championship Decider</p>
              </div>
            </div>
            <button
              onClick={downloadScoresCSV}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition-all flex items-center gap-2"
              title="Download scores as CSV"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              CSV
            </button>
          </div>
          
          <div className="bg-slate-800 rounded-2xl p-8 border-2 border-yellow-500">
            <div className="flex items-center justify-between mb-6">
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-white mb-2">{finalMatch.teamA.name}</div>
                <div className="text-sm text-emerald-400">Group Champion</div>
              </div>
              <div className="text-3xl font-bold text-yellow-400 mx-6">VS</div>
              <div className="flex-1 text-center">
                <div className="text-2xl font-bold text-white mb-2">{finalMatch.teamB.name}</div>
                <div className="text-sm text-emerald-400">Group Champion</div>
              </div>
            </div>
            
            {!finalMatch.completed ? (
              <>
                <div className="grid grid-cols-3 gap-6 mb-6 items-center">
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={finalMatch.scoreA}
                      onChange={(e) => updateScore(finalMatch.id, 'A', parseInt(e.target.value) || 0)}
                      className="w-full text-6xl font-bold text-center bg-slate-700 text-white rounded-xl py-6 px-2 border-2 border-slate-600 focus:border-yellow-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                  
                  <div className="text-4xl font-bold text-yellow-400 text-center">
                    /
                  </div>
                  
                  <div className="text-center">
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={finalMatch.scoreB}
                      onChange={(e) => updateScore(finalMatch.id, 'B', parseInt(e.target.value) || 0)}
                      className="w-full text-6xl font-bold text-center bg-slate-700 text-white rounded-xl py-6 px-2 border-2 border-slate-600 focus:border-yellow-500 focus:outline-none"
                      placeholder="0"
                    />
                  </div>
                </div>
                
                {(finalMatch.scoreA >= 21 || finalMatch.scoreB >= 21) && (
                  <button
                    onClick={() => finishMatch(finalMatch.id)}
                    className="w-full py-4 bg-yellow-500 hover:bg-yellow-600 text-slate-900 font-bold text-xl rounded-xl transition-all flex items-center justify-center shadow-lg shadow-yellow-500/50"
                  >
                    <Trophy className="w-6 h-6 mr-2" />
                    Declare Champion
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-6">
                <div className="flex items-center justify-center gap-8 mb-4">
                  <div className={`text-5xl font-bold ${finalMatch.winnerId === finalMatch.teamA.id ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {finalMatch.scoreA}
                  </div>
                  <div className="text-slate-500 text-3xl">-</div>
                  <div className={`text-5xl font-bold ${finalMatch.winnerId === finalMatch.teamB.id ? 'text-yellow-400' : 'text-slate-500'}`}>
                    {finalMatch.scoreB}
                  </div>
                </div>
                <div className="text-yellow-400 text-lg flex items-center justify-center">
                  <Check className="w-6 h-6 mr-2" />
                  Match Completed
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Render Knockout Stage (OLD)
  const renderKnockout = () => {
    const qualifierMatches = matches.filter(m => m.phase === 'qualifier');
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
            {/* Qualifiers */}
            {qualifierMatches.length > 0 && (
              <div className="w-full">
                <h2 className="text-2xl font-bold text-emerald-400 mb-4 text-center">
                  {qualifierMatches.length === 1 ? 'Qualifier Match' : 'Qualifier Matches'}
                </h2>
                <div className={`grid grid-cols-1 ${qualifierMatches.length > 1 ? 'md:grid-cols-2' : ''} gap-8 max-w-4xl mx-auto`}>
                  {qualifierMatches.map((match, index) => (
                    <div key={match.id}>
                      {qualifierMatches.length > 1 && (
                        <div className="text-center text-slate-400 mb-2 font-semibold">
                          Qualifier {index + 1}
                        </div>
                      )}
                      {renderKnockoutMatch(match)}
                    </div>
                  ))}
                </div>
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
          <div className="grid grid-cols-3 gap-4 mb-4 items-center">
            <div className="text-center">
              <input
                type="number"
                min="0"
                max="30"
                value={match.scoreA}
                onChange={(e) => updateScore(match.id, 'A', parseInt(e.target.value) || 0)}
                className="w-full text-5xl font-bold text-center bg-slate-700 text-white rounded-xl py-4 px-2 border-2 border-slate-600 focus:border-emerald-500 focus:outline-none"
                placeholder="0"
              />
            </div>
            
            <div className="text-3xl font-bold text-emerald-400 text-center">
              /
            </div>
            
            <div className="text-center">
              <input
                type="number"
                min="0"
                max="30"
                value={match.scoreB}
                onChange={(e) => updateScore(match.id, 'B', parseInt(e.target.value) || 0)}
                className="w-full text-5xl font-bold text-center bg-slate-700 text-white rounded-xl py-4 px-2 border-2 border-slate-600 focus:border-emerald-500 focus:outline-none"
                placeholder="0"
              />
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
                      TPG: {team.totalPoints > 0 ? '+' : ''}{team.totalPoints}
                    </div>
                    <div className="text-sm text-slate-400">
                      {team.matchesPlayed} Matches | {team.wins}W-{team.losses}L
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="flex gap-4">
          <button
            onClick={downloadScoresCSV}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-xl transition-all flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Complete Results
          </button>
          <button
            onClick={downloadScoresCSV}
            className="px-8 py-4 bg-slate-700 hover:bg-slate-600 text-white font-bold text-lg rounded-xl transition-all flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Download Complete Results
          </button>
          <button
            onClick={resetTournament}
            className="px-8 py-4 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg rounded-xl transition-all shadow-lg shadow-emerald-500/50"
          >
            Start New Tournament
          </button>
        </div>
      </div>
    </div>
  );

  // Main render
  return (
    <div className="font-sans">
      {phase === 'setup' && renderSetup()}
      {(phase === 'round1' || phase === 'round2') && renderGroupStage()}
      {phase === 'final' && renderFinal()}
      {phase === 'knockout_old' && renderKnockout()}
      {phase === 'complete' && renderComplete()}
      
      {/* Group Configuration Modal - Appears over all phases */}
      {showGroupConfig && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-lg p-8 max-w-2xl w-full mx-4 border-2 border-emerald-500">
            <h2 className="text-2xl font-bold text-emerald-400 mb-4 flex items-center gap-2">
              <Target className="w-6 h-6" />
              {matches.length === 0 
                ? `Configure Round ${currentRound} Groups`
                : `Choose Configuration for Round ${currentRound + 1}`
              }
            </h2>
            <p className="text-slate-300 mb-6">
              {groupConfigOptions.length > 0 && 
                `${groupConfigOptions[0].description.split('.')[0]}. Select how to organize the teams:`
              }
            </p>
            <div className="space-y-3">
              {groupConfigOptions.map((config) => (
                <button
                  key={config.id}
                  onClick={() => advanceToNextRound(config.id)}
                  className="w-full bg-slate-700 hover:bg-emerald-600 text-white p-4 rounded-lg transition-colors text-left border-2 border-slate-600 hover:border-emerald-400"
                >
                  <div className="font-bold text-lg text-emerald-300 mb-1">{config.name}</div>
                  <div className="text-slate-300 text-sm">{config.description}</div>
                  <div className="text-slate-400 text-xs mt-2">
                    {config.groupCount === 1 
                      ? `All ${config.groupSizes[0]} teams play against each other`
                      : `${config.groupCount} groups: ${config.groupSizes.join(' vs ')}`
                    }
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setShowGroupConfig(false)}
              className="mt-4 w-full bg-slate-600 hover:bg-slate-500 text-white p-2 rounded-lg transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TournamentManager;
