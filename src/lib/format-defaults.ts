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
      },
      {
        "id": "2a1lcntg",
        "name": "Complex Rhythm"
      },
      {
        "id": "ngsebgtf",
        "name": "Consistency"
      },
      {
        "id": "hb9a2tkd",
        "name": "Speed Alt"
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

export const DEFAULT_ROUNDS: PlanRound[] = [
  {
    "sr": 7.2,
    "bans": 1,
    "cats": [
      {
        "id": "aim",
        "maps": [
          {
            "id": "pfqpwws8",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "66fuqh6f",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "0kej0mi6",
              "tapping-0"
            ]
          },
          {
            "id": "anohlhaq",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2fuk88g9",
              "aim-1"
            ]
          },
          {
            "id": "536qyv0e",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          }
        ],
        "name": "AIM"
      },
      {
        "id": "dfhh1t44",
        "maps": [
          {
            "id": "nl1q2lrr",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "tapping-0",
              "tapping-4"
            ]
          },
          {
            "id": "sfqn51dp",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2a1lcntg"
            ]
          },
          {
            "id": "nyf0773y",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-5",
              "50r2xnz2"
            ]
          },
          {
            "id": "wfsqho1d",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-1"
            ]
          }
        ],
        "name": "TAPPING"
      },
      {
        "id": "rnjchr7s",
        "maps": [
          {
            "id": "7yioc28w",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "ddc2ii78",
              "e9t9lkge",
              "tapping-3"
            ]
          },
          {
            "id": "0rq719x2",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "g4v2ts1t",
              "0fju3xrn"
            ]
          }
        ],
        "name": "GIMMICK"
      },
      {
        "id": "7xi19szz",
        "maps": [
          {
            "id": "7dggtjgc",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "2pmn7d0g",
              "aim-1"
            ]
          },
          {
            "id": "y1hxc0jr",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "m5mvpvwf",
              "s6u7r0it"
            ]
          },
          {
            "id": "bxr6r2ik",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-3",
              "xaxvf2lx"
            ]
          }
        ],
        "name": "READING"
      }
    ],
    "name": "Round of 16",
    "slug": "round-of-16",
    "tbNote": "",
    "firstTo": 5,
    "tbSubcategoryIds": [
      "ngsebgtf",
      "aim-0",
      "tapping-0"
    ]
  },
  {
    "sr": 7.4,
    "bans": 1,
    "cats": [
      {
        "id": "aim",
        "maps": [
          {
            "id": "dauwe42m",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "efp0o8mk",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "0kej0mi6",
              "tapping-0"
            ]
          },
          {
            "id": "o5lxtbeq",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2fuk88g9",
              "aim-1"
            ]
          },
          {
            "id": "aodxfk03",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          }
        ],
        "name": "AIM"
      },
      {
        "id": "dfhh1t44",
        "maps": [
          {
            "id": "u99ah4d3",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "tapping-0",
              "tapping-4"
            ]
          },
          {
            "id": "unuum74v",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2a1lcntg"
            ]
          },
          {
            "id": "6j8lhaz7",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-5",
              "tapping-3"
            ]
          },
          {
            "id": "orhn4lb2",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-1"
            ]
          }
        ],
        "name": "TAPPING"
      },
      {
        "id": "rnjchr7s",
        "maps": [
          {
            "id": "9kujknc6",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "9pn4vs27"
            ]
          },
          {
            "id": "pzoan4d3",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "ddc2ii78",
              "e9t9lkge"
            ]
          },
          {
            "id": "6wcmqr3l",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "d3ggt15s",
              "ucbcdkma"
            ]
          },
          {
            "id": "s4e8jz39",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "g4v2ts1t",
              "0fju3xrn"
            ]
          }
        ],
        "name": "GIMMICK"
      },
      {
        "id": "7xi19szz",
        "maps": [
          {
            "id": "crt7fft7",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "2pmn7d0g",
              "aim-1"
            ]
          },
          {
            "id": "tmdyyqar",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "s6u7r0it",
              "gimmick-7"
            ]
          },
          {
            "id": "pg5fqu6a",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-3",
              "xaxvf2lx"
            ]
          }
        ],
        "name": "READING"
      }
    ],
    "name": "Quarterfinals",
    "slug": "quarterfinals",
    "tbNote": "",
    "firstTo": 6,
    "tbSubcategoryIds": [
      "ngsebgtf",
      "0kej0mi6",
      "tapping-4"
    ]
  },
  {
    "sr": 7.5,
    "bans": 1,
    "cats": [
      {
        "id": "aim",
        "maps": [
          {
            "id": "u7j20tkb",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "4uynkgz0",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "0kej0mi6",
              "tapping-0"
            ]
          },
          {
            "id": "yb4gf85x",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2fuk88g9",
              "aim-1"
            ]
          },
          {
            "id": "gcq904m5",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "tonxiyw5",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          }
        ],
        "name": "AIM"
      },
      {
        "id": "dfhh1t44",
        "maps": [
          {
            "id": "aozuurxo",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "tapping-0",
              "tapping-4"
            ]
          },
          {
            "id": "eg7x0azl",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2a1lcntg"
            ]
          },
          {
            "id": "9qwjibew",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-5",
              "50r2xnz2"
            ]
          },
          {
            "id": "quxmv12r",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-1"
            ]
          }
        ],
        "name": "TAPPING"
      },
      {
        "id": "rnjchr7s",
        "maps": [
          {
            "id": "zshi6iq7",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "9pn4vs27",
              "0kej0mi6"
            ]
          },
          {
            "id": "a08a2tj8",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "e9t9lkge",
              "tapping-3"
            ]
          },
          {
            "id": "ggkaee4y",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "d3ggt15s",
              "ucbcdkma"
            ]
          },
          {
            "id": "zhbi08ed",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "g4v2ts1t",
              "0fju3xrn"
            ]
          }
        ],
        "name": "GIMMICK"
      },
      {
        "id": "7xi19szz",
        "maps": [
          {
            "id": "q6bruh7f",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "2pmn7d0g",
              "aim-1"
            ]
          },
          {
            "id": "5qwyxo2i",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "m5mvpvwf",
              "s6u7r0it"
            ]
          },
          {
            "id": "n30119rn",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-3",
              "xaxvf2lx"
            ]
          },
          {
            "id": "nd6n6tjr",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "m5mvpvwf",
              "0fju3xrn"
            ]
          }
        ],
        "name": "READING"
      }
    ],
    "name": "Semifinals",
    "slug": "semifinals",
    "tbNote": "",
    "firstTo": 6,
    "tbSubcategoryIds": [
      "ngsebgtf",
      "aim-0",
      "tapping-4"
    ]
  },
  {
    "sr": 7.6,
    "bans": 1,
    "cats": [
      {
        "id": "aim",
        "maps": [
          {
            "id": "w9bwmrkv",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "kqd5iuag",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "0kej0mi6",
              "tapping-0"
            ]
          },
          {
            "id": "dz92kefx",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2fuk88g9",
              "aim-1"
            ]
          },
          {
            "id": "myjdz76f",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "c4zetrvv",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-0",
              "xaxvf2lx"
            ]
          }
        ],
        "name": "AIM"
      },
      {
        "id": "dfhh1t44",
        "maps": [
          {
            "id": "eopdvjli",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "tapping-4",
              "tapping-1"
            ]
          },
          {
            "id": "1v8vo3nw",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2a1lcntg",
              "tapping-0"
            ]
          },
          {
            "id": "9c8ek0uh",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "hb9a2tkd"
            ]
          },
          {
            "id": "vg5g768f",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-5",
              "tapping-3"
            ]
          }
        ],
        "name": "TAPPING"
      },
      {
        "id": "rnjchr7s",
        "maps": [
          {
            "id": "5l9043ck",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "ddc2ii78",
              "e9t9lkge"
            ]
          },
          {
            "id": "s6mxnddg",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "9pn4vs27",
              "d3ggt15s"
            ]
          },
          {
            "id": "rtjsesof",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "ucbcdkma",
              "gimmick-7"
            ]
          },
          {
            "id": "m2jj9y1u",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "g4v2ts1t",
              "0fju3xrn"
            ]
          }
        ],
        "name": "GIMMICK"
      },
      {
        "id": "7xi19szz",
        "maps": [
          {
            "id": "qx4zp1cm",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "2pmn7d0g",
              "aim-0"
            ]
          },
          {
            "id": "aw9c7yxh",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "m5mvpvwf",
              "s6u7r0it"
            ]
          },
          {
            "id": "gak2d65g",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-3",
              "m5mvpvwf"
            ]
          },
          {
            "id": "cab3psj4",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "0fju3xrn",
              "aim-1"
            ]
          }
        ],
        "name": "READING"
      }
    ],
    "name": "Finals",
    "slug": "finals",
    "tbNote": "",
    "firstTo": 7,
    "tbSubcategoryIds": [
      "ngsebgtf",
      "0kej0mi6",
      "tapping-0"
    ]
  },
  {
    "sr": 7.7,
    "bans": 2,
    "cats": [
      {
        "id": "aim",
        "maps": [
          {
            "id": "vq0ulgj1",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "b3i0rjt4",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "0kej0mi6",
              "tapping-0"
            ]
          },
          {
            "id": "fvc0xhsr",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "aim-3"
            ]
          },
          {
            "id": "y0d5sem3",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2fuk88g9",
              "aim-1"
            ]
          },
          {
            "id": "ywf3ciqg",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "aim-0"
            ]
          },
          {
            "id": "jmji7dfh",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-0",
              "xaxvf2lx"
            ]
          }
        ],
        "name": "AIM"
      },
      {
        "id": "dfhh1t44",
        "maps": [
          {
            "id": "xmu19oni",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "tapping-0",
              "tapping-4"
            ]
          },
          {
            "id": "qfb4694g",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "2a1lcntg"
            ]
          },
          {
            "id": "39ufntxa",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "hb9a2tkd"
            ]
          },
          {
            "id": "090279ho",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-1",
              "tapping-4"
            ]
          },
          {
            "id": "f4p5n7wu",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "tapping-5",
              "tapping-3"
            ]
          }
        ],
        "name": "TAPPING"
      },
      {
        "id": "rnjchr7s",
        "maps": [
          {
            "id": "9dxq6ny9",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "9pn4vs27"
            ]
          },
          {
            "id": "fzsugrxu",
            "mod": "NM",
            "note": "",
            "subcategoryIds": [
              "ddc2ii78",
              "e9t9lkge"
            ]
          },
          {
            "id": "5dw1zpna",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "d3ggt15s",
              "ucbcdkma"
            ]
          },
          {
            "id": "7yf2hcu1",
            "mod": "HR",
            "note": "",
            "subcategoryIds": [
              "g4v2ts1t",
              "0fju3xrn"
            ]
          }
        ],
        "name": "GIMMICK"
      },
      {
        "id": "7xi19szz",
        "maps": [
          {
            "id": "7vfv4q7j",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "2pmn7d0g",
              "aim-1"
            ]
          },
          {
            "id": "rhvflt1f",
            "mod": "HD",
            "note": "",
            "subcategoryIds": [
              "m5mvpvwf",
              "gimmick-7"
            ]
          },
          {
            "id": "vpezjdxo",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "aim-3",
              "m5mvpvwf"
            ]
          },
          {
            "id": "eknqdib8",
            "mod": "DT",
            "note": "",
            "subcategoryIds": [
              "0fju3xrn",
              "s6u7r0it"
            ]
          }
        ],
        "name": "READING"
      }
    ],
    "name": "Grand Finals",
    "slug": "grand-finals",
    "tbNote": "",
    "firstTo": 7,
    "tbSubcategoryIds": [
      "ngsebgtf",
      "aim-0",
      "tapping-0",
      "tapping-4"
    ]
  }
];
