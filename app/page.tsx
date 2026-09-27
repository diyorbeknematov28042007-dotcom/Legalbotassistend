const blocks = [
  {
    title: "Signal",
    body: "Public Telegram kanali yangi huquqiy material borligini bildiradi.",
  },
  {
    title: "Verify",
    body: "Agent faqat allowlistdagi Lex.uz va boshqa rasmiy URL’larni fakt manbasi sifatida oladi.",
  },
  {
    title: "Generate",
    body: "Gemini rasmiy hujjatdan o‘zbekcha, qisqa va tekshiriladigan draft yaratadi.",
  },
  {
    title: "Approve",
    body: "Draft avval admin Telegram chatiga boradi. Tasdiqlangandan keyingina kanalga chiqadi.",
  },
];

export default function Home() {
  return (
    <main>
      <span className="badge">Legal News Agent · Foundation</span>
      <h1>Legalbotassistend</h1>
      <p>
        Source-driven huquqiy yangilik agenti. Telegram — signal. Rasmiy manba —
        source of truth. AI esa faqat rasmiy hujjatni sharhlaydi.
      </p>

      <div className="grid">
        {blocks.map((block) => (
          <section className="card" key={block.title}>
            <strong>{block.title}</strong>
            <p>{block.body}</p>
          </section>
        ))}
      </div>

      <div className="card" style={{ marginTop: 14 }}>
        <strong>Health endpoint</strong>
        <p>
          Deploydan keyin <code>/api/health</code> Neon ulanishini tekshiradi.
        </p>
      </div>
    </main>
  );
}
