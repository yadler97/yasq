import { describe, it, expect } from "vitest";
import { Participant } from "@yasq/shared";
import {
  findUser,
  getUserId,
  capitalize,
  formatBonusMultiplier,
  getActionKeyLabel,
} from "./helper";

const mockParticipants: Participant[] = [
  { id: "1", username: "MockPlayer1" },
  { id: "2", username: "MockPlayer2" },
];

describe("findUser", () => {
  it("returns the participant when found in the list and updates cache", () => {
    const user = findUser(mockParticipants, "1");
    expect(user).toEqual({ id: "1", username: "MockPlayer1" });
  });

  it("falls back to the userCache if participant is not in the current list", () => {
    // First, populate cache by finding user "1"
    findUser(mockParticipants, "1");

    // Now pass a participants list that doesn't contain "1"
    const user = findUser([{ id: "2", username: "MockPlayer1" }], "1");
    expect(user).toEqual({ id: "1", username: "MockPlayer1" });
  });

  it("returns default unknown user if not in participants list or cache", () => {
    const user = findUser(mockParticipants, "999");
    expect(user).toEqual({ id: "0", username: "Unknown" });
  });
});

describe("getUserId", () => {
  it("returns null if auth is null or undefined", () => {
    expect(getUserId(null)).toBeNull();
    expect(getUserId(undefined)).toBeNull();
  });

  it("returns null if auth.user is missing", () => {
    expect(getUserId({})).toBeNull();
  });

  it("returns user id when present", () => {
    const auth = { user: { id: "1" } };
    expect(getUserId(auth)).toBe("1");
  });
});

describe("capitalize", () => {
  it("properly capitalizes snake_case strings", () => {
    expect(capitalize("hello_world")).toBe("Hello World");
  });

  it("handles single words and casing correctly", () => {
    expect(capitalize("TEST_STRING_value")).toBe("Test String Value");
  });
});

describe("formatBonusMultiplier", () => {
  it("returns 'Off' when rate is 0", () => {
    expect(formatBonusMultiplier(0)).toBe("Off");
  });

  it("correctly formats rate into percentage string", () => {
    expect(formatBonusMultiplier(0.2)).toBe("+20.0%");
    expect(formatBonusMultiplier(0.1555)).toBe("+15.6%");
  });
});

describe("getActionKeyLabel", () => {
  it("returns command symbol for Mac", () => {
    expect(getActionKeyLabel(true)).toBe("⌘");
  });

  it("returns Alt for non-Mac", () => {
    expect(getActionKeyLabel(false)).toBe("Alt");
  });
});