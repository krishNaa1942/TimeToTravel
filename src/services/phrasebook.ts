/**
 * Language Phrasebook Service
 * Backend: /api/language
 */
import apiService from "./api";

export interface PhraseData {
  destination: string;
  language: string;
  script?: string;
  phrases: { english: string; local: string; pronunciation?: string; category?: string }[];
}

export const phrasebookService = {
  async getPhrases(destination: string): Promise<PhraseData> {
    return apiService.get(`/language/phrases?destination=${encodeURIComponent(destination)}`);
  },

  async getDestinations(): Promise<{ destinations: string[] }> {
    return apiService.get("/language/destinations");
  },
};

export default phrasebookService;
