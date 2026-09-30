import { describe, expect, it } from "vitest";

import {
  buildPriceTable,
  buildSizeSwitch,
  chipStates,
  type PageOption,
  parseSelectionParams,
  resolveSelected,
  selectForChip,
  selectionQuery,
  sizeLabels,
} from "./option-selection";

const valve: PageOption = {
  code: "valve",
  name: "نوع شیر",
  values: [
    { code: "persi", label: "پرسی" },
    { code: "butane", label: "بوتان" },
  ],
};
const fill: PageOption = {
  code: "fill",
  name: "وضعیت تحویل",
  values: [
    { code: "empty", label: "خالی" },
    { code: "filled", label: "پرشده" },
  ],
};
const size: PageOption = {
  code: "size",
  name: "اندازه",
  values: [
    { code: "11", label: "۱۱" },
    { code: "25", label: "۲۵" },
  ],
};

const charge = [
  { id: "a", selection: { valve: "persi" }, price: 100 },
  { id: "b", selection: { valve: "butane" }, price: 120 },
];

describe("parseSelectionParams", () => {
  it("مقدار معتبر را می‌خواند و نامعتبر را نادیده می‌گیرد", () => {
    expect(parseSelectionParams({ valve: "butane" }, [valve])).toEqual({
      valve: "butane",
    });
    expect(parseSelectionParams({ valve: "xyz" }, [valve])).toEqual({});
    expect(
      parseSelectionParams({ other: "x", valve: ["persi", "butane"] }, [valve]),
    ).toEqual({
      valve: "persi",
    });
    expect(parseSelectionParams({}, [valve])).toEqual({});
  });
});

describe("resolveSelected", () => {
  it("درخواست دقیق، پیش‌فرض اولین ترکیب و ترکیب غیرفعال ⇒ نزدیک‌ترین", () => {
    expect(resolveSelected(charge, { valve: "butane" }, [valve])?.id).toBe("b");
    expect(resolveSelected(charge, {}, [valve])?.id).toBe("a");
    expect(resolveSelected([], {}, [valve])).toBeNull();

    // اندازه ۱۱ فقط پرسی دارد؛ درخواست 11 + بوتان ⇒ همان ۱۱ پرسی
    const used = [
      { id: "x", selection: { size: "11", valve: "persi" } },
      { id: "y", selection: { size: "25", valve: "butane" } },
    ];
    expect(
      resolveSelected(used, { size: "11", valve: "butane" }, [size, valve])?.id,
    ).toBe("x");
  });
});

describe("chipStates و selectForChip", () => {
  const variants = [
    { id: "p", selection: { size: "11", fill: "empty" } },
    { id: "q", selection: { size: "11", fill: "filled" } },
    { id: "r", selection: { size: "25", fill: "filled" } },
  ];

  it("مقدار بدون ترکیب فعال غیرقابل انتخاب است", () => {
    const [sizes, fills] = chipStates(
      [size, fill],
      variants,
      variants[0]!.selection,
    );
    expect(sizes!.chips.map((c) => c.available)).toEqual([true, true]);
    expect(fills!.chips.every((c) => c.available)).toBe(true);
    const onlyFilled = chipStates(
      [size, fill],
      [variants[2]!],
      variants[2]!.selection,
    );
    expect(onlyFilled[1]!.chips.map((c) => c.available)).toEqual([false, true]);
    expect(onlyFilled[0]!.chips.map((c) => c.selected)).toEqual([false, true]);
  });

  it("کلیک روی مقداری که با انتخاب فعلی ترکیب ندارد ⇒ نزدیک‌ترین ترکیب", () => {
    expect(
      selectForChip(variants, { size: "11", fill: "empty" }, "size", "25")?.id,
    ).toBe("r");
    expect(
      selectForChip(variants, { size: "11", fill: "filled" }, "fill", "empty")
        ?.id,
    ).toBe("p");
    expect(selectForChip(variants, {}, "size", "99")).toBeNull();
  });
});

describe("selectionQuery", () => {
  it("به ترتیب گروه‌ها؛ خالی ⇒ بدون علامت سؤال", () => {
    expect(selectionQuery([size, fill], { fill: "empty", size: "11" })).toBe(
      "?size=11&fill=empty",
    );
    expect(selectionQuery([valve], {})).toBe("");
  });
});

describe("sizeLabels و buildSizeSwitch", () => {
  const names = [
    "شارژ کپسول گاز ۱۱ کیلویی",
    "شارژ کپسول گاز ۲۵ کیلویی",
    "شارژ کپسول گاز ۳۳ کیلویی",
    "شارژ کپسول گاز ۵۰ کیلویی",
  ];

  it("برچسب کوتاه و پسوند مشترک", () => {
    expect(sizeLabels(names)).toEqual({
      labels: ["۱۱", "۲۵", "۳۳", "۵۰"],
      suffix: "کیلویی",
    });
    expect(sizeLabels(["الف", "ب"])).toEqual({
      labels: ["الف", "ب"],
      suffix: "",
    });
    expect(sizeLabels(["کپسول گاز", "کپسول گاز"]).suffix).toBe("");
  });

  it("پارامتر گزینه‌ی فعلی در لینک‌ها حفظ می‌شود و تک‌محصول سوییچ ندارد", () => {
    const siblings = names.map((name, index) => ({
      name,
      slug: `refill-${["11", "25", "33", "50"][index]}kg`,
      options: [valve],
    }));
    const result = buildSizeSwitch(siblings, "refill-11kg", {
      valve: "butane",
    });
    expect(result.suffix).toBe("کیلویی");
    expect(result.items.map((item) => item.current)).toEqual([
      true,
      false,
      false,
      false,
    ]);
    expect(result.items[1]!.href).toBe("/products/refill-25kg?valve=butane");
    expect(buildSizeSwitch([siblings[0]!], "refill-11kg", {}).items).toEqual(
      [],
    );
  });

  it("گزینه‌ی ناموجود در هم‌خانواده منتقل نمی‌شود", () => {
    const result = buildSizeSwitch(
      [
        { name: "خرید ۱۱ کیلویی", slug: "buy-11", options: [fill] },
        { name: "خرید ۲۵ کیلویی", slug: "buy-25", options: [fill] },
      ],
      "buy-11",
      { valve: "butane", fill: "filled" },
    );
    expect(result.items[1]!.href).toBe("/products/buy-25?fill=filled");
  });
});

describe("buildPriceTable", () => {
  const product = (slug: string, name: string, prices: [string, number][]) => ({
    slug,
    name,
    options: [valve],
    variants: prices.map(([code, price]) => ({
      selection: { valve: code },
      price,
    })),
  });

  it("ردیف = محصول، ستون = نوع شیر، هر سلول لینک ترکیب", () => {
    const table = buildPriceTable([
      product("c11", "شارژ ۱۱", [
        ["persi", 3_400_000],
        ["butane", 3_400_000],
      ]),
      product("c25", "شارژ ۲۵", [["persi", 7_000_000]]),
    ]);
    expect(table.columnGroup).toBe("نوع شیر");
    expect(table.columns.map((c) => c.label)).toEqual(["پرسی", "بوتان"]);
    expect(table.rows).toHaveLength(2);
    expect(table.rows[0]!.href).toBe("/products/c11");
    expect(table.rows[0]!.cells[1]).toEqual({
      price: 3_400_000,
      href: "/products/c11?valve=butane",
    });
    // ترکیب غیرفعال/نبود ⇒ null
    expect(table.rows[1]!.cells).toEqual([
      { price: 7_000_000, href: "/products/c25?valve=persi" },
      null,
    ]);
  });

  it("گروه میانی در عنوان ردیف (دست دوم: اندازه × وضعیت)", () => {
    const table = buildPriceTable([
      {
        slug: "used",
        name: "دست دوم",
        options: [size, fill],
        variants: [
          { selection: { size: "11", fill: "empty" }, price: 1 },
          { selection: { size: "11", fill: "filled" }, price: 2 },
          { selection: { size: "25", fill: "filled" }, price: 3 },
        ],
      },
    ]);
    expect(table.columns.map((c) => c.code)).toEqual(["empty", "filled"]);
    expect(table.rows.map((row) => row.midLabel)).toEqual(["۱۱", "۲۵"]);
    expect(table.rows[0]!.href).toBe("/products/used?size=11");
    expect(table.rows[1]!.cells.map((c) => c?.price ?? null)).toEqual([
      null,
      3,
    ]);
  });

  it("محصولات بدون گزینه ⇒ یک ستون «قیمت»", () => {
    const table = buildPriceTable([
      {
        slug: "a",
        name: "الف",
        options: [],
        variants: [{ selection: {}, price: 5 }],
      },
      {
        slug: "b",
        name: "ب",
        options: [],
        variants: [{ selection: {}, price: 6 }],
      },
    ]);
    expect(table.columnGroup).toBeNull();
    expect(table.columns).toEqual([{ code: "price", label: "قیمت" }]);
    expect(table.rows.map((row) => row.cells[0]?.price)).toEqual([5, 6]);
  });
});
