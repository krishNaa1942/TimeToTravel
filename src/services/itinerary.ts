/**
 * Itinerary Service
 * POST /api/itinerary/generate – AI-powered day-by-day trip itinerary
 */

import apiService from "./api";

export interface ItineraryActivity {
  activity: string;
  description: string;
  duration: string;
  cost: string;
}

export interface ItineraryDay {
  day: number;
  title: string;
  morning: ItineraryActivity;
  afternoon: ItineraryActivity;
  evening: ItineraryActivity;
  tip: string;
}

export interface ItineraryResponse {
  destination: string;
  num_days: number;
  family_size: number;
  travel_class: string;
  interests: string;
  itinerary: ItineraryDay[];
}

export const itineraryService = {
  async generate(
    destination: string,
    numDays: number,
    familySize: number,
    travelClass: "economy" | "comfort" | "premium" = "economy",
    interests: string = ""
  ): Promise<ItineraryResponse> {
    return apiService.post<ItineraryResponse>("/itinerary/generate", {
      destination,
      num_days: numDays,
      family_size: familySize,
      travel_class: travelClass,
      interests,
    });
  },
};

export default itineraryService;
