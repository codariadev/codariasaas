export const money = (v: number) =>
  "R$ " +
  v.toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
export const dmy = (iso: string) => iso.split("-").reverse().join("/");
