import type { PlanRound, SubcategoryGroup } from "./format-plan";

export const DEFAULT_CATALOG: SubcategoryGroup[] = [
  {
    "id": "aim",
    "name": "Aim",
    "items": [
      {
        "id": "aim-0",
        "name": "Jump Aim"
      },
      {
        "id": "aim-1",
        "name": "Awkward Aim"
      },
      {
        "id": "aim-3",
        "name": "Speed Aim"
      },
      {
        "id": "0kej0mi6",
        "name": "Flow Aim"
      },
      {
        "id": "ucbcdkma",
        "name": "Slider Aim"
      },
      {
        "id": "2fuk88g9",
        "name": "Precision"
      }
    ]
  },
  {
    "id": "tapping",
    "name": "Tapping",
    "items": [
      {
        "id": "tapping-0",
        "name": "Streams"
      },
      {
        "id": "tapping-1",
        "name": "Deathstreams"
      },
      {
        "id": "tapping-3",
        "name": "Finger Control"
      },
      {
        "id": "tapping-4",
        "name": "Stamina"
      },
      {
        "id": "tapping-5",
        "name": "Speed"
      },
      {
        "id": "e9t9lkge",
        "name": "Variable BPM"
      },
      {
        "id": "50r2xnz2",
        "name": "Bursts"
      }
    ]
  },
  {
    "id": "gimmick",
    "name": "Gimmick",
    "items": [
      {
        "id": "gimmick-7",
        "name": "Big Circles"
      },
      {
        "id": "ddc2ii78",
        "name": "Polyrhythm"
      },
      {
        "id": "g4v2ts1t",
        "name": "Slider Tech"
      },
      {
        "id": "d3ggt15s",
        "name": "Stream Tech"
      },
      {
        "id": "9pn4vs27",
        "name": "Grid / TAG4"
      }
    ]
  },
  {
    "id": "lzajp423",
    "name": "reading",
    "items": [
      {
        "id": "xaxvf2lx",
        "name": "High AR"
      },
      {
        "id": "2pmn7d0g",
        "name": "Low AR"
      },
      {
        "id": "m5mvpvwf",
        "name": "High Density"
      },
      {
        "id": "0fju3xrn",
        "name": "Alt"
      },
      {
        "id": "s6u7r0it",
        "name": "Aim Control"
      }
    ]
  }
];

export const DEFAULT_RO16: PlanRound = {
  "slug": "round-of-16",
  "name": "Round of 16",
  "firstTo": 5,
  "bans": 1,
  "sr": 7.2,
  "tbNote": "",
  "tbSubcategoryIds": [
    "d3ggt15s",
    "tapping-4",
    "0kej0mi6"
  ],
  "cats": [
    {
      "id": "aim",
      "name": "Aim",
      "maps": [
        {
          "id": "NM0",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "aim-0"
          ]
        },
        {
          "id": "NM1",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "0kej0mi6",
            "tapping-0",
            "tapping-4"
          ]
        },
        {
          "id": "HR2",
          "mod": "HR",
          "note": "",
          "subcategoryIds": [
            "2fuk88g9",
            "aim-1"
          ]
        },
        {
          "id": "DT3",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "aim-3",
            "xaxvf2lx"
          ]
        }
      ]
    },
    {
      "id": "dfhh1t44",
      "name": "TAPPING",
      "maps": [
        {
          "id": "ffbowy7v",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "tapping-0",
            "tapping-4",
            "tapping-1"
          ]
        },
        {
          "id": "h37hytkk",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "tapping-5",
            "tapping-3",
            "50r2xnz2"
          ]
        },
        {
          "id": "5e1uu21n",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "tapping-4",
            "tapping-1"
          ]
        }
      ]
    },
    {
      "id": "rnjchr7s",
      "name": "GIMMICK",
      "maps": [
        {
          "id": "o75jhwlo",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "ddc2ii78",
            "e9t9lkge",
            "tapping-3"
          ]
        },
        {
          "id": "04aql7u2",
          "mod": "HD",
          "note": "",
          "subcategoryIds": [
            "d3ggt15s",
            "ucbcdkma"
          ]
        },
        {
          "id": "xun0z8bu",
          "mod": "HR",
          "note": "",
          "subcategoryIds": [
            "g4v2ts1t",
            "0fju3xrn",
            "ucbcdkma"
          ]
        }
      ]
    },
    {
      "id": "7xi19szz",
      "name": "READING",
      "maps": [
        {
          "id": "pcxodw8b",
          "mod": "HD",
          "note": "",
          "subcategoryIds": [
            "2pmn7d0g",
            "aim-1"
          ]
        },
        {
          "id": "lqofif86",
          "mod": "HD",
          "note": "",
          "subcategoryIds": [
            "2pmn7d0g",
            "m5mvpvwf",
            "gimmick-7"
          ]
        },
        {
          "id": "5wpcmekd",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "xaxvf2lx",
            "aim-1",
            "aim-3"
          ]
        }
      ]
    }
  ]
};

export const DEFAULT_QF: PlanRound = {
  "slug": "quarterfinals",
  "name": "Quarterfinals",
  "firstTo": 6,
  "bans": 1,
  "sr": 7.3,
  "tbNote": "",
  "tbSubcategoryIds": [
    "g4v2ts1t",
    "aim-0",
    "50r2xnz2"
  ],
  "cats": [
    {
      "id": "aim",
      "name": "Aim",
      "maps": [
        {
          "id": "NM0",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "aim-0"
          ]
        },
        {
          "id": "NM1",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "0kej0mi6",
            "tapping-0",
            "tapping-4"
          ]
        },
        {
          "id": "HR2",
          "mod": "HR",
          "note": "",
          "subcategoryIds": [
            "2fuk88g9",
            "aim-1"
          ]
        },
        {
          "id": "DT3",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "aim-3",
            "xaxvf2lx"
          ]
        }
      ]
    },
    {
      "id": "dfhh1t44",
      "name": "TAPPING",
      "maps": [
        {
          "id": "ffbowy7v",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "tapping-0",
            "tapping-4",
            "tapping-1"
          ]
        },
        {
          "id": "h37hytkk",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "tapping-5",
            "tapping-3",
            "50r2xnz2"
          ]
        },
        {
          "id": "5e1uu21n",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "tapping-4",
            "tapping-1"
          ]
        },
        {
          "id": "txxvajtt",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "tapping-5",
            "xaxvf2lx",
            "e9t9lkge"
          ]
        }
      ]
    },
    {
      "id": "rnjchr7s",
      "name": "GIMMICK",
      "maps": [
        {
          "id": "o75jhwlo",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "9pn4vs27",
            "2pmn7d0g",
            "aim-1"
          ]
        },
        {
          "id": "04aql7u2",
          "mod": "HD",
          "note": "",
          "subcategoryIds": [
            "d3ggt15s",
            "ucbcdkma"
          ]
        },
        {
          "id": "xun0z8bu",
          "mod": "HR",
          "note": "",
          "subcategoryIds": [
            "g4v2ts1t",
            "0fju3xrn",
            "ucbcdkma"
          ]
        }
      ]
    },
    {
      "id": "7xi19szz",
      "name": "READING",
      "maps": [
        {
          "id": "8i4bgrcc",
          "mod": "NM",
          "note": "",
          "subcategoryIds": [
            "aim-0",
            "aim-1",
            "m5mvpvwf"
          ]
        },
        {
          "id": "pcxodw8b",
          "mod": "HD",
          "note": "",
          "subcategoryIds": [
            "2pmn7d0g",
            "aim-1"
          ]
        },
        {
          "id": "lqofif86",
          "mod": "HD",
          "note": "",
          "subcategoryIds": [
            "2pmn7d0g",
            "m5mvpvwf",
            "gimmick-7"
          ]
        },
        {
          "id": "5wpcmekd",
          "mod": "DT",
          "note": "",
          "subcategoryIds": [
            "xaxvf2lx",
            "aim-1",
            "aim-3"
          ]
        }
      ]
    }
  ]
};
