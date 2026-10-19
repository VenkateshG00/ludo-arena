import React from "react";

const RULES = [
  {
    icon: "🎯",
    title: "Objective",
    body: "Be the first player to move all 4 of your tokens from your base, around the board, and into your home column. The center star is your finish line.",
  },
  {
    icon: "🎲",
    title: "Rolling the Dice",
    body: "On your turn, click the dice to roll. You get one roll per turn. Rolling a 6 earns you an extra turn — use it wisely!",
  },
  {
    icon: "🚪",
    title: "Leaving the Base",
    body: "You can only leave your base by rolling a 6. Your token then enters the track at your color's entry square.",
  },
  {
    icon: "⭐",
    title: "Safe Squares",
    body: "Star-marked squares are safe zones. Your tokens cannot be captured while sitting on them. Each color's entry square is also safe.",
  },
  {
    icon: "⚔️",
    title: "Capturing",
    body: "Land on an opponent's token on a non-safe square to send it back to their base. Capturing earns you another turn!",
  },
  {
    icon: "🏠",
    title: "Home Column",
    body: "After one full lap of the board, your token enters the colored home column. You must roll the exact number to reach the final center square.",
  },
  {
    icon: "🧱",
    title: "Blocks",
    body: "Two tokens of the same color on one square form a block. Opponents cannot pass through or land on a blocked square.",
  },
  {
    icon: "🏆",
    title: "Winning",
    body: "The first player to bring all 4 tokens home wins the game. Get ready for some friendly competition!",
  },
];

export function RulesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl text-yellow-400 mb-2">How to Play</h1>
        <p className="text-white/50">Everything you need to know about Ludo Arena</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        {RULES.map((rule, i) => (
          <div
            key={i}
            className="bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/[0.07] hover:border-white/20 transition group"
          >
            <div className="flex items-center gap-3 mb-2">
              <span className="text-2xl group-hover:scale-110 transition-transform">{rule.icon}</span>
              <h2 className="font-display text-lg text-white">{rule.title}</h2>
            </div>
            <p className="text-white/60 text-sm leading-relaxed">{rule.body}</p>
          </div>
        ))}
      </div>

      <div className="mt-10 text-center bg-yellow-400/10 border border-yellow-400/20 rounded-2xl p-6">
        <p className="text-yellow-300 font-bold mb-1">Ready to play?</p>
        <p className="text-white/50 text-sm">
          Create a room and share the invite link with friends — no sign-up needed.
        </p>
        <a
          href="/"
          className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-yellow-400 text-ludo-dark font-bold hover:bg-yellow-300 transition active:scale-95"
        >
          Start Playing →
        </a>
      </div>
    </div>
  );
}
