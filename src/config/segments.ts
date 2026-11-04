export type SegmentId = "barbearia" | "salao" | "estetica";
export interface Segment {
  label: string; accent: string; professionals: string[]; customers: string[];
  services: { name: string; price: number; min: number }[];
  products: { name: string; qty: number; min: number; price: number }[];
  campaigns: string[];
}
// Dados fictícios: substituir por Firestore (modules/*) na fase de backend.
export const SEGMENTS: Record<SegmentId, Segment> = {
  barbearia: { label: "Barbearia", accent: "#7c4dff",
    professionals: ["Lucas Silva", "Matheus Santos", "Rafael Costa", "Gustavo Pereira"],
    customers: ["Bruno Costa", "Gabriel Souza", "Felipe Santos", "Lucas Ferreira", "Rafael Lima", "Thiago Alves", "André Moreira"],
    services: [{ name: "Corte", price: 45, min: 40 }, { name: "Barba", price: 35, min: 30 }, { name: "Corte + Barba", price: 70, min: 65 }, { name: "Degradê", price: 45, min: 50 }],
    products: [{ name: "Pomada modeladora", qty: 14, min: 5, price: 32 }, { name: "Óleo para barba", qty: 3, min: 5, price: 28 }, { name: "Shampoo", qty: 22, min: 8, price: 18 }],
    campaigns: ["Barba grátis no aniversário", "Traga um amigo", "Cliente sumido: 30 dias"] },
  salao: { label: "Salão de beleza", accent: "#b13fd6",
    professionals: ["Ana Costa", "Bruna Almeida", "Carla Souza", "Débora Lima"],
    customers: ["Juliana Mendes", "Camila Souza", "Patrícia Lima", "Fernanda Alves", "Beatriz Santos", "Mariana Costa", "Carla Oliveira"],
    services: [{ name: "Corte + escova", price: 120, min: 90 }, { name: "Manicure", price: 60, min: 50 }, { name: "Hidratação capilar", price: 150, min: 70 }, { name: "Sobrancelhas", price: 70, min: 30 }],
    products: [{ name: "Máscara capilar", qty: 9, min: 5, price: 45 }, { name: "Esmalte", qty: 34, min: 15, price: 9 }, { name: "Shampoo", qty: 4, min: 6, price: 38 }],
    campaigns: ["Combo noiva", "Hidratação + escova", "Cliente sumido: 45 dias"] },
  estetica: { label: "Estúdio de estética", accent: "#0e9f8e",
    professionals: ["Marina Rocha", "Paula Nunes", "Renata Dias", "Sofia Prado"],
    customers: ["Alice Barros", "Helena Ramos", "Larissa Melo", "Isabela Cruz", "Vanessa Reis", "Tatiane Luz", "Elisa Faria"],
    services: [{ name: "Limpeza de pele", price: 140, min: 60 }, { name: "Drenagem linfática", price: 160, min: 60 }, { name: "Peeling", price: 220, min: 45 }, { name: "Design de sobrancelhas", price: 70, min: 30 }],
    products: [{ name: "Sérum vitamina C", qty: 11, min: 5, price: 95 }, { name: "Máscara facial", qty: 30, min: 10, price: 22 }, { name: "Protetor solar", qty: 3, min: 6, price: 48 }],
    campaigns: ["Pacote 4 sessões", "Indique e ganhe", "Cliente sumido: 60 dias"] },
};
