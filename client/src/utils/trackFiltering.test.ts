import { describe, it, expect, vi } from "vitest";
import {
  getBaseFilteredTracks,
  getFilteredAndSortedTracks,
  getAvailableTagsByType,
  getReachableTags,
  getRandomEligibleTrack,
} from "./trackFiltering";
import { Playlist, Track } from "./types";
import mockTracksData from "../../../mock_data/mockTracks.json";

// Map the raw JSON data to satisfy the `Track` interface by adding default values for optional/required runtime fields
const mockTracks: Track[] = (mockTracksData as Omit<Track, "played" | "originalIndex">[]).map((t, index) => ({
  ...t,
  played: index === 1, // Make the second track played for testing hidePlayed
  originalIndex: index,
}));

const mockPlaylists: Playlist[] = [
  {
    name: "Favorites",
    tracks: [mockTracksData[1].audio],
  },
];

describe("getBaseFilteredTracks", () => {
  it("returns an empty array if tracks is null", () => {
    const result = getBaseFilteredTracks(null, [], "All playlists", "", false);
    expect(result).toEqual([]);
  });

  it("filters by search term", () => {
    const result = getBaseFilteredTracks(mockTracks, [], "All playlists", "Game A", false);
    expect(result).toHaveLength(1);
    expect(result[0].game).toBe("Game A");
  });

  it("filters out played tracks when hidePlayed is true", () => {
    const result = getBaseFilteredTracks(mockTracks, [], "All playlists", "", true);
    expect(result).toHaveLength(3); // Game B is marked played, so only A, C, D remain
    expect(result.map(t => t.game)).not.toContain("Game B");
  });

  it("filters by playlist", () => {
    const result = getBaseFilteredTracks(mockTracks, mockPlaylists, "Favorites", "", false);
    expect(result).toHaveLength(1);
    expect(result[0].audio).toBe(mockTracks[1].audio);
  });
});

describe("getFilteredAndSortedTracks", () => {
  it("sorts tracks alphabetically by game name (A-Z)", () => {
    const unsorted = [mockTracks[3], mockTracks[0]];
    const result = getFilteredAndSortedTracks(unsorted, [], "All playlists", "A-Z", {});
    expect(result[0].game).toBe("Game A");
    expect(result[1].game).toBe("Game D");
  });

  it("sorts tracks in reverse alphabetical order (Z-A)", () => {
    const result = getFilteredAndSortedTracks(mockTracks.slice(0, 2), [], "All playlists", "Z-A", {});
    expect(result[0].game).toBe("Game B");
    expect(result[1].game).toBe("Game A");
  });
});

describe("getRandomEligibleTrack", () => {
  it("returns null if no eligible unplayed tracks exist", () => {
    const allPlayed = mockTracks.map(t => ({ ...t, played: true }));
    const result = getRandomEligibleTrack(allPlayed);
    expect(result).toBeNull();
  });

  it("only picks from unplayed tracks", () => {
    // Only Track A is unplayed in this adjusted list
    const tracks = [
      { ...mockTracks[0], played: false },
      { ...mockTracks[1], played: true },
      { ...mockTracks[2], played: true },
    ];

    const result = getRandomEligibleTrack(tracks);
    expect(result?.audio).toBe("track001.mp3");
  });

  it("picks randomly using Math.random", () => {
    // Mock Math.random to always pick the first element of the eligible list
    const mathRandomSpy = vi.spyOn(Math, "random").mockReturnValue(0);

    const result = getRandomEligibleTrack(mockTracks);
    expect(result?.audio).toBe("track001.mp3");

    mathRandomSpy.mockRestore();
  });
});

describe("getAvailableTagsByType", () => {
  it("extracts unique tags grouped by type from mock data", () => {
    const tags = getAvailableTagsByType(mockTracks);
    expect(tags).toEqual({
      platform: ["Platform A", "Platform B", "Platform C"],
      release: ["2024", "2025", "2026"],
    });
  });
});

describe("getReachableTags", () => {
  it("calculates correct tag counts based on active base filters", () => {
    const reachable = getReachableTags(mockTracks, [], "All playlists", "", true, {});
    // Game B is played and hidden; Platforms A, C, D remain
    expect(reachable.get("Platform B")).toBeUndefined();
    expect(reachable.get("Platform A")).toBe(1);
  });
});