import type { MatchDayData } from "./types/MatchDayData";
import { MatchDayService } from "./services/MatchDayService";
import { GeneralDataService } from "./services/GeneralDataService";
import type { GeneralData } from "./types/GeneralData";

export async function getGeneralData(url: string): Promise<GeneralData | null> {
  try {
    const service = new GeneralDataService(url);
    return await service.getGeneralData();
  } catch (err) {
    console.error("❌ Failed to get general data:", err);
    return null;
  }
}

export async function getMatchDayData(
  url: string
): Promise<MatchDayData | null> {
  try {
    const service = new MatchDayService(url);
    return await service.getMatchDayData();
  } catch (err) {
    console.error("❌ Failed to get match day data:", err);
    return null;
  }
}

// export type { MatchDayData };
