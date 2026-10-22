import { describe, expect, it } from "vitest"

import { placeTypes, PROVINCES, SPORT_TYPES } from "@/lib/places"

describe("places", () => {
  it("lists a place's sport types once, in list order, without Other", () => {
    expect(
      placeTypes([
        { type: "tennis" },
        { type: "other" },
        { type: "football" },
        { type: "tennis" },
      ]),
    ).toEqual(["football", "tennis"])
  })

  it("has the same lists as the backend", () => {
    expect(SPORT_TYPES).toHaveLength(14)
    expect(PROVINCES).toHaveLength(18)
  })
})
