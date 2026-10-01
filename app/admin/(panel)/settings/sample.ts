const SAMPLE: Record<string, string> = {
  name: "Maria",
  phone: "(201) 555-0142",
  item: "Samsung 28 cu ft French-door refrigerator",
  price: "650",
  message: "Hi, is this still available?",
};

export function fillSample(tpl: string): string {
  return tpl.replace(/\{(\w+)\}/g, (_, k: string) => SAMPLE[k] ?? "");
}
