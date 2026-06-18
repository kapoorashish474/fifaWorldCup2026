/**
 * Dynamic Factors System
 * 
 * Real-time prediction adjustments based on:
 * 1. Weather conditions at venue
 * 2. Rest days since last match
 * 3. Tournament momentum (recent results)
 * 4. Venue altitude
 * 5. Match timing (day/night)
 */

import { EspnResult } from './espnResults';

// Venue data with coordinates for weather and altitude
export interface VenueData {
  name: string;
  city: string;
  country: string;
  lat: number;
  lon: number;
  altitude: number; // meters above sea level
}

export const VENUES: Record<string, VenueData> = {
  // USA Venues
  'MetLife Stadium': { name: 'MetLife Stadium', city: 'East Rutherford', country: 'USA', lat: 40.8128, lon: -74.0742, altitude: 10 },
  'AT&T Stadium': { name: 'AT&T Stadium', city: 'Arlington', country: 'USA', lat: 32.7473, lon: -97.0945, altitude: 180 },
  'Hard Rock Stadium': { name: 'Hard Rock Stadium', city: 'Miami', country: 'USA', lat: 25.958, lon: -80.2389, altitude: 3 },
  'SoFi Stadium': { name: 'SoFi Stadium', city: 'Los Angeles', country: 'USA', lat: 33.9535, lon: -118.3392, altitude: 30 },
  'Levi\'s Stadium': { name: 'Levi\'s Stadium', city: 'San Francisco', country: 'USA', lat: 37.4033, lon: -121.9695, altitude: 5 },
  'Mercedes-Benz Stadium': { name: 'Mercedes-Benz Stadium', city: 'Atlanta', country: 'USA', lat: 33.7553, lon: -84.401, altitude: 320 },
  'NRG Stadium': { name: 'NRG Stadium', city: 'Houston', country: 'USA', lat: 29.6847, lon: -95.4107, altitude: 15 },
  'Lincoln Financial Field': { name: 'Lincoln Financial Field', city: 'Philadelphia', country: 'USA', lat: 39.9008, lon: -75.1675, altitude: 12 },
  'Arrowhead Stadium': { name: 'Arrowhead Stadium', city: 'Kansas City', country: 'USA', lat: 39.0489, lon: -94.4839, altitude: 270 },
  'Lumen Field': { name: 'Lumen Field', city: 'Seattle', country: 'USA', lat: 47.5952, lon: -122.3316, altitude: 5 },
  'Gillette Stadium': { name: 'Gillette Stadium', city: 'Foxborough', country: 'USA', lat: 42.0909, lon: -71.2643, altitude: 60 },
  // Mexico Venues
  'Estadio Azteca': { name: 'Estadio Azteca', city: 'Mexico City', country: 'Mexico', lat: 19.3029, lon: -99.1505, altitude: 2240 },
  'Estadio BBVA': { name: 'Estadio BBVA', city: 'Monterrey', country: 'Mexico', lat: 25.6699, lon: -100.2444, altitude: 540 },
  'Estadio Akron': { name: 'Estadio Akron', city: 'Guadalajara', country: 'Mexico', lat: 20.6825, lon: -103.4624, altitude: 1560 },
  // Canada Venues
  'BMO Field': { name: 'BMO Field', city: 'Toronto', country: 'Canada', lat: 43.6332, lon: -79.4186, altitude: 90 },
  'BC Place': { name: 'BC Place', city: 'Vancouver', country: 'Canada', lat: 49.2768, lon: -123.112, altitude: 10 },
};

// Weather conditions
export interface WeatherData {
  temp: number; // Celsius
  humidity: number; // %
  windSpeed: number; // km/h
  condition: 'clear' | 'cloudy' | 'rain' | 'heavy_rain' | 'storm' | 'hot' | 'cold';
  description: string;
}

// Dynamic adjustment for a match
export interface DynamicAdjustment {
  factor: string;
  adjustment: number; // -10 to +10 for each team
  favoredTeam: string;
  reason: string;
  icon: string;
}

export interface MatchDynamicFactors {
  matchId: string;
  teamA: string;
  teamB: string;
  weather?: WeatherData;
  venue?: VenueData;
  restDaysA?: number;
  restDaysB?: number;
  momentumA?: number; // -3 to +3 based on recent tournament results
  momentumB?: number;
  adjustments: DynamicAdjustment[];
  totalAdjustmentA: number;
  totalAdjustmentB: number;
  lastUpdated: number;
}

// Calculate rest days since last match
export function calculateRestDays(
  team: string,
  matchDate: string,
  results: Map<string, EspnResult>
): number | undefined {
  let lastMatchDate: string | undefined;
  
  for (const [, result] of results) {
    if (result.state !== 'post') continue;
    if (result.teamA === team || result.teamB === team) {
      // We'd need match date from ESPN data, approximating for now
      lastMatchDate = new Date().toISOString().split('T')[0];
    }
  }
  
  if (!lastMatchDate) return undefined;
  
  const matchDateObj = new Date(matchDate);
  const lastDateObj = new Date(lastMatchDate);
  const diffTime = matchDateObj.getTime() - lastDateObj.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  return diffDays > 0 ? diffDays : undefined;
}

// Calculate tournament momentum from results
export function calculateMomentum(
  team: string,
  results: Map<string, EspnResult>
): number {
  let momentum = 0;
  let matchesFound = 0;
  
  for (const [, result] of results) {
    if (result.state !== 'post') continue;
    if (result.teamA !== team && result.teamB !== team) continue;
    
    matchesFound++;
    if (matchesFound > 3) break; // Last 3 matches only
    
    const isWinner = result.winner === team;
    const isDraw = !result.winner;
    const [goalsA, goalsB] = result.score.split('–').map(Number);
    const teamGoals = result.teamA === team ? goalsA : goalsB;
    const oppGoals = result.teamA === team ? goalsB : goalsA;
    
    if (isWinner) {
      momentum += 1;
      if (teamGoals - oppGoals >= 2) momentum += 0.5; // Big win bonus
    } else if (isDraw) {
      momentum += 0;
    } else {
      momentum -= 1;
      if (oppGoals - teamGoals >= 2) momentum -= 0.5; // Heavy loss penalty
    }
  }
  
  return Math.max(-3, Math.min(3, momentum));
}

// Weather impact analysis
export function analyzeWeatherImpact(
  weather: WeatherData,
  teamA: string,
  teamB: string,
  teamContinents: Record<string, string>
): DynamicAdjustment | null {
  const continentA = teamContinents[teamA];
  const continentB = teamContinents[teamB];
  
  // Rain favors defensive, physical teams
  if (weather.condition === 'rain' || weather.condition === 'heavy_rain') {
    // European teams often more experienced in rain
    if (continentA === 'EU' && continentB !== 'EU') {
      return {
        factor: 'weather',
        adjustment: 3,
        favoredTeam: teamA,
        reason: `Rain conditions - ${teamA} from Europe more accustomed to wet weather`,
        icon: '🌧️',
      };
    }
    if (continentB === 'EU' && continentA !== 'EU') {
      return {
        factor: 'weather',
        adjustment: 3,
        favoredTeam: teamB,
        reason: `Rain conditions - ${teamB} from Europe more accustomed to wet weather`,
        icon: '🌧️',
      };
    }
    return {
      factor: 'weather',
      adjustment: 0,
      favoredTeam: 'neutral',
      reason: 'Rain may slow down attacking play for both teams',
      icon: '🌧️',
    };
  }
  
  // High heat favors teams from hot climates
  if (weather.condition === 'hot' || weather.temp > 30) {
    const hotClimates = ['AF', 'SA', 'AS'];
    const aFromHot = hotClimates.includes(continentA);
    const bFromHot = hotClimates.includes(continentB);
    
    if (aFromHot && !bFromHot) {
      return {
        factor: 'weather',
        adjustment: 4,
        favoredTeam: teamA,
        reason: `Heat (${weather.temp}°C) - ${teamA} better adapted to hot conditions`,
        icon: '🔥',
      };
    }
    if (bFromHot && !aFromHot) {
      return {
        factor: 'weather',
        adjustment: 4,
        favoredTeam: teamB,
        reason: `Heat (${weather.temp}°C) - ${teamB} better adapted to hot conditions`,
        icon: '🔥',
      };
    }
  }
  
  // Strong wind affects passing teams
  if (weather.windSpeed > 30) {
    return {
      factor: 'weather',
      adjustment: 2,
      favoredTeam: 'physical',
      reason: `Strong winds (${weather.windSpeed}km/h) may disrupt technical play`,
      icon: '💨',
    };
  }
  
  return null;
}

// Altitude impact analysis
export function analyzeAltitudeImpact(
  venue: VenueData,
  teamA: string,
  teamB: string,
  teamContinents: Record<string, string>
): DynamicAdjustment | null {
  if (venue.altitude < 1000) return null;
  
  const continentA = teamContinents[teamA];
  const continentB = teamContinents[teamB];
  
  // High altitude venues (Mexico City = 2240m)
  if (venue.altitude >= 2000) {
    // South American teams used to altitude
    const highAltitudeNations = ['Ecuador', 'Colombia', 'Bolivia', 'Mexico'];
    const aUsedToAltitude = highAltitudeNations.includes(teamA) || continentA === 'SA';
    const bUsedToAltitude = highAltitudeNations.includes(teamB) || continentB === 'SA';
    
    if (aUsedToAltitude && !bUsedToAltitude) {
      return {
        factor: 'altitude',
        adjustment: 5,
        favoredTeam: teamA,
        reason: `High altitude (${venue.altitude}m) at ${venue.city} - ${teamA} better adapted`,
        icon: '⛰️',
      };
    }
    if (bUsedToAltitude && !aUsedToAltitude) {
      return {
        factor: 'altitude',
        adjustment: 5,
        favoredTeam: teamB,
        reason: `High altitude (${venue.altitude}m) at ${venue.city} - ${teamB} better adapted`,
        icon: '⛰️',
      };
    }
    
    return {
      factor: 'altitude',
      adjustment: 0,
      favoredTeam: 'neutral',
      reason: `High altitude (${venue.altitude}m) may tire both teams faster`,
      icon: '⛰️',
    };
  }
  
  return null;
}

// Rest days impact
export function analyzeRestDaysImpact(
  restDaysA: number | undefined,
  restDaysB: number | undefined,
  teamA: string,
  teamB: string
): DynamicAdjustment | null {
  if (restDaysA === undefined || restDaysB === undefined) return null;
  
  const diff = restDaysA - restDaysB;
  
  if (Math.abs(diff) >= 2) {
    const moreRested = diff > 0 ? teamA : teamB;
    const lessRested = diff > 0 ? teamB : teamA;
    const adjustment = Math.min(4, Math.abs(diff));
    
    return {
      factor: 'rest',
      adjustment,
      favoredTeam: moreRested,
      reason: `${moreRested} has ${Math.abs(diff)} more rest days than ${lessRested}`,
      icon: '😴',
    };
  }
  
  return null;
}

// Tournament momentum impact
export function analyzeMomentumImpact(
  momentumA: number,
  momentumB: number,
  teamA: string,
  teamB: string
): DynamicAdjustment | null {
  const diff = momentumA - momentumB;
  
  if (Math.abs(diff) >= 1) {
    const hotTeam = diff > 0 ? teamA : teamB;
    const coldTeam = diff > 0 ? teamB : teamA;
    const adjustment = Math.min(4, Math.round(Math.abs(diff) * 1.5));
    
    return {
      factor: 'momentum',
      adjustment,
      favoredTeam: hotTeam,
      reason: `${hotTeam} in better tournament form than ${coldTeam}`,
      icon: '🔥',
    };
  }
  
  return null;
}

// Mock weather fetch (in real implementation, would call weather API)
export async function fetchWeatherForVenue(venue: VenueData, matchDate: string): Promise<WeatherData> {
  // Simulate weather based on location and season
  const month = new Date(matchDate).getMonth();
  const isWarmSeason = month >= 5 && month <= 8; // June-August
  
  // Base temperatures by location
  let baseTemp = 22;
  if (venue.country === 'Mexico') baseTemp = isWarmSeason ? 26 : 20;
  if (venue.city === 'Miami' || venue.city === 'Houston') baseTemp = isWarmSeason ? 32 : 24;
  if (venue.city === 'Seattle' || venue.city === 'Vancouver') baseTemp = isWarmSeason ? 20 : 14;
  
  // Add some randomness
  const temp = baseTemp + Math.floor(Math.random() * 6) - 3;
  const humidity = 40 + Math.floor(Math.random() * 40);
  const windSpeed = 5 + Math.floor(Math.random() * 25);
  
  // Random weather condition
  const conditions: WeatherData['condition'][] = ['clear', 'cloudy', 'rain', 'clear', 'clear', 'cloudy'];
  const condition = temp > 32 ? 'hot' : temp < 10 ? 'cold' : conditions[Math.floor(Math.random() * conditions.length)];
  
  const descriptions: Record<WeatherData['condition'], string> = {
    clear: 'Clear skies',
    cloudy: 'Partly cloudy',
    rain: 'Light rain expected',
    heavy_rain: 'Heavy rain',
    storm: 'Thunderstorms',
    hot: 'Hot and humid',
    cold: 'Cold conditions',
  };
  
  return {
    temp,
    humidity,
    windSpeed,
    condition,
    description: descriptions[condition],
  };
}

// Main function to compute all dynamic factors for a match
export async function computeDynamicFactors(
  matchId: string,
  teamA: string,
  teamB: string,
  kickoff: string,
  venueName: string | undefined,
  results: Map<string, EspnResult>,
  teamContinents: Record<string, string>
): Promise<MatchDynamicFactors> {
  const adjustments: DynamicAdjustment[] = [];
  let totalAdjustmentA = 0;
  let totalAdjustmentB = 0;
  
  // Find venue
  const venue = venueName ? Object.values(VENUES).find(v => 
    venueName.toLowerCase().includes(v.name.toLowerCase()) ||
    venueName.toLowerCase().includes(v.city.toLowerCase())
  ) : undefined;
  
  // Get weather if venue known
  let weather: WeatherData | undefined;
  if (venue) {
    weather = await fetchWeatherForVenue(venue, kickoff);
    
    // Analyze weather impact
    const weatherImpact = analyzeWeatherImpact(weather, teamA, teamB, teamContinents);
    if (weatherImpact) {
      adjustments.push(weatherImpact);
      if (weatherImpact.favoredTeam === teamA) totalAdjustmentA += weatherImpact.adjustment;
      else if (weatherImpact.favoredTeam === teamB) totalAdjustmentB += weatherImpact.adjustment;
    }
    
    // Analyze altitude impact
    const altitudeImpact = analyzeAltitudeImpact(venue, teamA, teamB, teamContinents);
    if (altitudeImpact) {
      adjustments.push(altitudeImpact);
      if (altitudeImpact.favoredTeam === teamA) totalAdjustmentA += altitudeImpact.adjustment;
      else if (altitudeImpact.favoredTeam === teamB) totalAdjustmentB += altitudeImpact.adjustment;
    }
  }
  
  // Calculate rest days
  const restDaysA = calculateRestDays(teamA, kickoff, results);
  const restDaysB = calculateRestDays(teamB, kickoff, results);
  const restImpact = analyzeRestDaysImpact(restDaysA, restDaysB, teamA, teamB);
  if (restImpact) {
    adjustments.push(restImpact);
    if (restImpact.favoredTeam === teamA) totalAdjustmentA += restImpact.adjustment;
    else if (restImpact.favoredTeam === teamB) totalAdjustmentB += restImpact.adjustment;
  }
  
  // Calculate momentum
  const momentumA = calculateMomentum(teamA, results);
  const momentumB = calculateMomentum(teamB, results);
  const momentumImpact = analyzeMomentumImpact(momentumA, momentumB, teamA, teamB);
  if (momentumImpact) {
    adjustments.push(momentumImpact);
    if (momentumImpact.favoredTeam === teamA) totalAdjustmentA += momentumImpact.adjustment;
    else if (momentumImpact.favoredTeam === teamB) totalAdjustmentB += momentumImpact.adjustment;
  }
  
  return {
    matchId,
    teamA,
    teamB,
    weather,
    venue,
    restDaysA,
    restDaysB,
    momentumA,
    momentumB,
    adjustments,
    totalAdjustmentA,
    totalAdjustmentB,
    lastUpdated: Date.now(),
  };
}
