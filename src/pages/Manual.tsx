import { useState } from 'react'
import { TabNav } from '../components/TabNav'

// The six manual sections, ported verbatim from the design preview.
// Inline-styled HTML so it renders identically; edit the copy here freely.
const CONTENT: Record<string, string> = {
  schedule: `<p style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;line-height:1.4;text-align:center;color:#1c5540;margin:6px 8px 22px">Four Days. Two Teams. One Champion.</p>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Thu 7/9</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Draft Day<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Check-in &amp; the snake draft</small></h2>
      </div>
      <div style="padding:6px 18px 8px">
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">Daytime</span><span><span style="font-weight:600">Optional casual round</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">For anyone who wants to get out early — organizer &amp; tee time TBD.</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">4:00 PM</span><span><span style="font-weight:600">Airbnb check-in</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">58 Pyngyp Road, Stony Point, NY 10980</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">7:00 PM</span><span><span style="font-weight:600">The Draft</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">~1 hour. Captains PJ McGovern &amp; Matt Eulau build their squads.</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">8–9 PM</span><span><span style="font-weight:600">Finalize Friday pairings</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Captains set the lineups for Day 1.</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">9:30 PM</span><span><span style="font-weight:600">Pairings announced</span></span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">Dinner</span><span><span style="font-weight:600">Pizza / Italian</span></span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Fri 7/10</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Day 1 — Two Rounds<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Patriot Hills → Rotella Memorial</small></h2>
      </div>
      <div style="padding:6px 18px 8px">
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">AM</span><span><span style="font-weight:600">Round 1 · Patriot Hills GC <span style="display:inline-block;background:#ece3cb;color:#1c5540;border-radius:999px;padding:2px 10px;font-size:12.5px;letter-spacing:.04em;font-weight:600;margin-left:6px;vertical-align:middle">2v2 Scramble</span></span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Tee times 8:40 / 8:50 / 9:00 / 9:10 / 9:20 AM · $100 w/ cart</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">Midday</span><span><span style="font-weight:600">Lunch to-go</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Pre-ordered, boxed by Patriot Hills as you finish — eat en route to Rotella.</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">PM</span><span><span style="font-weight:600">Round 2 · Phillip J. Rotella Memorial <span style="display:inline-block;background:#ece3cb;color:#1c5540;border-radius:999px;padding:2px 10px;font-size:12.5px;letter-spacing:.04em;font-weight:600;margin-left:6px;vertical-align:middle">2v2 Best Ball</span><span style="display:inline-block;background:#e1ede4;color:#1c5540;border:1px solid #b9d3c1;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px">Stroke Play</span></span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Tee times 2:20 / 2:30 / 2:40 / 2:50 / 3:00 PM · $90 w/ cart</span></span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">Dinner</span><span><span style="font-weight:600">Grill out at the house</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Day 2 pairings announced.</span></span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Sat 7/11</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Day 2 — Two Rounds<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Patriot Hills → New York Country Club</small></h2>
      </div>
      <div style="padding:6px 18px 8px">
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">AM</span><span><span style="font-weight:600">Round 3 · Patriot Hills GC <span style="display:inline-block;background:#ece3cb;color:#1c5540;border-radius:999px;padding:2px 10px;font-size:12.5px;letter-spacing:.04em;font-weight:600;margin-left:6px;vertical-align:middle">2v2 Best Ball</span><span style="display:inline-block;background:#e1ede4;color:#1c5540;border:1px solid #b9d3c1;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px">Match Play</span></span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Tee times 8:40 / 8:50 / 9:00 / 9:10 / 9:20 AM · $135 w/ cart</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">Midday</span><span><span style="font-weight:600">Lunch at the course</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">PM</span><span><span style="font-weight:600">Round 4 · New York Country Club <span style="display:inline-block;background:#ece3cb;color:#1c5540;border-radius:999px;padding:2px 10px;font-size:12.5px;letter-spacing:.04em;font-weight:600;margin-left:6px;vertical-align:middle">1v1 Singles</span></span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Tee times 2:50 / 3:00 / 3:10 / 3:20 / 3:30 PM · $100 · range included</span></span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">Dinner</span><span><span style="font-weight:600">Grill out at the house</span></span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">8:00 PM</span><span><span style="font-weight:600">Awards Ceremony 🏆</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">Crowning the first-ever Ferda Champion.</span></span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Sun 7/12</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Getaway Day<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Check out &amp; one for the road</small></h2>
      </div>
      <div style="padding:6px 18px 8px">
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">9–10 AM</span><span><span style="font-weight:600">Check out of the Airbnb</span></span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="flex:0 0 76px;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;font-size:15px;padding-top:1px">After</span><span><span style="font-weight:600">Optional final round</span><span style="display:block;font-size:14px;color:#5d6b5f;margin-top:2px">For anyone still standing.</span></span></li>
        </ul>
      </div>
    </div>`,
  rules: `<p style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;line-height:1.4;text-align:center;color:#1c5540;margin:6px 8px 22px">These rules govern all competitive play during The Ferda Invitational. All participants are expected to know and abide by them. The Commissioner's rulings are final.</p>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">The Code</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Code of Conduct</h2>
      </div>
      <div style="padding:6px 18px 8px"><p style="font-size:17.5px;line-height:1.55;padding:10px 2px 12px;margin:0">The whole point of this weekend is to get <strong style="color:#2f7256">into it</strong> — chirp, celebrate, talk a little trash. It's all part of the fun. But <strong style="color:#2f7256">keep it respectful and never take it personally.</strong> We're all here Ferda Boys.</p></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Formats</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">The Four Rounds</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Round 1 — Scramble (2v2).</span> Patriot Hills.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Round 2 — Best Ball (2v2).</span> Rotella. <span style="display:inline-block;background:#f6ecc6;color:#8a6d18;border:1px solid #d8c373;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px">⚠ Match or Stroke?</span></span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Round 3 — Best Ball (2v2).</span> Patriot Hills. <span style="display:inline-block;background:#f6ecc6;color:#8a6d18;border:1px solid #d8c373;font-size:11.5px;letter-spacing:.05em;text-transform:uppercase;font-weight:700;padding:2px 8px;border-radius:6px;margin-left:6px">⚠ Match or Stroke?</span></span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Round 4 — Singles (1v1).</span> New York Country Club.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Handicaps</span> are collected in advance (in the Google Sheet) and factored into every match.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Handicaps</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">How Handicaps Work</h2>
      </div>
      <div style="padding:6px 18px 8px">
        <p style="margin:10px 2px 4px;font-size:15.5px">Every match is played <b>net</b>, and the app does the math — you always enter your raw gross score. Here's what's happening underneath.</p>
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">1</span><span><span style="color:#2f7256;font-weight:700">Handicap Index.</span> Your official index, entered into the system by the organizer before the weekend.</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">2</span><span><span style="color:#2f7256;font-weight:700">Course Handicap.</span> Your index converted to the exact course and tees you're playing:<span style="display:block;margin:9px 0 4px;padding:10px 12px;background:#ece3cb;border-radius:9px;font-size:15px;color:#1c5540;text-align:center;font-variant-numeric:tabular-nums">Index × (Slope ÷ 113) + (Course Rating − Par)</span>rounded to the nearest whole number.</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">3</span><span><span style="color:#2f7256;font-weight:700">Strokes by hole.</span> That number is spread across the 18 holes by each hole's <b>Stroke Index</b> (SI 1 = hardest). A 14 gets a shot on the 14 hardest holes; anything over 18 gets a second shot on the lowest indexes.</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">4</span><span><span style="color:#2f7256;font-weight:700">Playing off the low.</span> In a match, the lowest handicap plays off scratch and everyone else gets the <i>difference</i> — so only the gap between players matters.</span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">5</span><span><span style="color:#2f7256;font-weight:700">Net score.</span> The app subtracts your strokes automatically and tracks the match in net terms. The handicap dots by your name (● / ●●) show where your shots fall.</span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Scramble</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Scramble Handicaps<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Round 1</small></h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">One ball, one score.</span> Both partners hit every shot, you play the best one from there, and the team records a single gross score per hole.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Small team handicap.</span> Two cracks at every shot already scores low, so the team gets a single <i>blended</i> handicap — commonly <b>35% of the low</b> partner + <b>15% of the high</b> — applied to the team's score.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Example.</span> A 6 and a 14 → (35% × 6) + (15% × 14) ≈ <b>4 team strokes</b>, taken on the 4 hardest holes.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Best Ball</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Best Ball Handicaps<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Rounds 2 &amp; 3</small></h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Everyone plays their own ball.</span> Each player holes out with their own ball and net score; the team takes the <b>better net</b> on each hole.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Full individual strokes.</span> Each player gets their <i>own</i> course handicap — commonly <b>90% in match play, 85% in stroke play</b> — allocated by Stroke Index as normal.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Off the low.</span> In match play the group is reduced to its lowest handicap, who plays off scratch while everyone else gets the difference.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule I</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Out of Bounds &amp; Lost Ball</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">One-stroke penalty drop.</span> Drop where the ball last crossed out of bounds — <b>no matter the stakes color</b> — a couple club lengths from the line. A tee shot hit OB means you're now playing your 3rd from the drop.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">No return to the tee required</span> — play from the drop. But if you do choose to re-tee, you're still hitting your <b>3rd</b>, not your 2nd.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Ball search limit</span> is 3 minutes. After that the ball is lost and the one-stroke drop applies.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Gallery Drop.</span> If the group unanimously agrees a ball is inbounds but can't be found, free relief with no penalty — drop where the group agrees it most likely came to rest.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule II</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Maximum Score</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Double par caps every hole.</span> Once you've hit double the hole's par, pick up and write it down — no need to hole out.<span style="display:block;font-size:13px;color:#8a8470;margin-top:5px"><strong style="color:#6f6a52;font-weight:700">Note:</strong> the app won't enforce it — it accepts any gross score, so apply the cap yourself when entering.</span></span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule III</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Mulligans</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">No mulligans.</span> All shots count. Play the ball as it lies. This applies to all rounds and all formats throughout the event.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule IV</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Concessions &amp; Gimmes</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Gimmes are acceptable by the other team.</span> A putt is good only when an opponent concedes it — you can never concede your own. Customary range is inside 3 feet.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span>In match play, a player may concede a hole at any time.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule V</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Pace of Play</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Ready golf is in effect</span> to keep pace — hit when ready, don't wait for strict order of play.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Honors are optional.</span> A team that just lost the previous hole may wait for the winners to tee off first if they'd like.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span>Be ready when it's your turn. Slow play may be subject to Commissioner intervention.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule VI</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Equipment &amp; Devices</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Rangefinders, GPS devices, and apps are permitted</span> without restriction. Slope compensation, wind readings, and all device features are allowed.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule VII</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">The Flagstick</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Player's choice.</span> Each player may putt with the flagstick in or out at their discretion.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span>Players may not unreasonably delay play to tend or remove the flagstick.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule VIII</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Disputes &amp; Rulings</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">The Commissioner has final ruling authority</span> on all disputes, penalties, and interpretations.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span>In cases not covered by these rules, USGA Rules of Golf apply as the default standard.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span>Rulings made in good faith are final. No retroactive scoring adjustments after a hole is completed.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rule IX</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Ferda Rules</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Lift, clean &amp; place — fairway only.</span> You may lift, clean, and place your ball in the fairway. Not in the rough.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Obstruction relief.</span> Against a root or man-made object (sign, garbage can, sprinkler, cart sign)? Move clear, no penalty. Against a rock wall or behind a tree? One penalty stroke to move away.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Bunker footprints.</span> A sand shot sitting in a clear footprint-type lie may be moved out of it.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Scorecards.</span> Collect both carts' scorecards and make sure they match — every card is added together at the end.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Side games &amp; prizes</span> are set by the Commissioner — see the Wagers tab.</span></li>
      </ul></div>
    </div>`,
  wagers: `<p style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;line-height:1.4;text-align:center;color:#1c5540;margin:6px 8px 22px">Play for your team. Settle up like gentlemen.</p>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">The Race</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Team Points<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">1 point per win · 0.5 per push</small></h2>
      </div>
      <div style="padding:6px 18px 8px">
        <table style="width:100%;border-collapse:collapse;font-size:15.5px">
          <tr><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top">Fri AM — Scramble (2v2)</td><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top;text-align:right;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;white-space:nowrap">5 pts</td></tr>
          <tr><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top">Fri PM — 2v2</td><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top;text-align:right;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;white-space:nowrap">5 pts</td></tr>
          <tr><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top">Sat AM — 2v2</td><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top;text-align:right;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;white-space:nowrap">5 pts</td></tr>
          <tr><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top">Sat PM — Singles (1v1)</td><td style="padding:11px 2px;border-bottom:1px solid rgba(14,58,41,.14);vertical-align:top;text-align:right;font-variant-numeric:tabular-nums;color:#1c5540;font-weight:700;white-space:nowrap">10 pts</td></tr>
          <tr><td style="padding:13px 2px 11px;border-top:2px solid rgba(14,58,41,.14);vertical-align:top;font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#1c5540">Total on the board</td><td style="padding:13px 2px 11px;border-top:2px solid rgba(14,58,41,.14);vertical-align:top;font-family:'Playfair Display',Georgia,serif;font-size:18px;color:#1c5540;text-align:right;font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap">25 pts</td></tr>
        </table>
        <ul style="list-style:none;margin:4px 0 0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">13 points</span> clinches the weekend.</span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Ties</span> in a group matchup roll that money into the Winners pot.</span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">The Pot</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Four pools, $215 in<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Each one settles on its own</small></h2>
      </div>
      <div style="padding:14px 16px 16px;display:flex;flex-direction:column;gap:12px">

        <div style="border:1px solid rgba(14,58,41,.16);border-left:5px solid #1c5540;border-radius:11px;padding:13px 15px;background:#fff">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:18px;color:#1c5540">The Cup</span>
            <span style="font-variant-numeric:tabular-nums;font-weight:700;color:#1c5540;white-space:nowrap">$150 in</span>
          </div>
          <p style="margin:4px 0 8px;font-size:14px;color:#5d6b5f">Team total match. Win the weekend, your squad splits the lot.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span style="background:#e8f0ea;color:#1c5540;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Win $300</span><span style="background:#fbf6e6;color:#7a6a1f;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Net +$150</span></div>
        </div>

        <div style="border:1px solid rgba(14,58,41,.16);border-left:5px solid #bcae5b;border-radius:11px;padding:13px 15px;background:#fff">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:18px;color:#1c5540">Matchups</span>
            <span style="font-variant-numeric:tabular-nums;font-weight:700;color:#1c5540;white-space:nowrap">$40 in</span>
          </div>
          <p style="margin:4px 0 8px;font-size:14px;color:#5d6b5f">$10 a round across all four rounds. Win yours, take the head-to-head.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span style="background:#e8f0ea;color:#1c5540;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Sweep $80</span><span style="background:#fbf6e6;color:#7a6a1f;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Net +$40</span></div>
        </div>

        <div style="border:1px solid rgba(14,58,41,.16);border-left:5px solid #c98a3a;border-radius:11px;padding:13px 15px;background:#fff">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:18px;color:#1c5540">Skills</span>
            <span style="font-variant-numeric:tabular-nums;font-weight:700;color:#1c5540;white-space:nowrap">$20 in</span>
          </div>
          <p style="margin:4px 0 8px;font-size:14px;color:#5d6b5f">$10 Longest Drive + $10 Closest to the Pin. A teammate winning = you win.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span style="background:#e8f0ea;color:#1c5540;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">$20 each</span><span style="background:#fbf6e6;color:#7a6a1f;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Net +$10 each</span></div>
        </div>

        <div style="border:1px solid rgba(14,58,41,.16);border-left:5px solid #caa92e;border-radius:11px;padding:13px 15px;background:#fff">
          <div style="display:flex;justify-content:space-between;align-items:baseline;gap:8px">
            <span style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:18px;color:#1c5540">Golfer of the Weekend</span>
            <span style="font-variant-numeric:tabular-nums;font-weight:700;color:#1c5540;white-space:nowrap">$5 in</span>
          </div>
          <p style="margin:4px 0 8px;font-size:14px;color:#5d6b5f">$5 from all 20. Best of points won, gross birdies &amp; best net — winner takes all.</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap"><span style="background:#e8f0ea;color:#1c5540;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Win $100</span><span style="background:#fbf6e6;color:#7a6a1f;font-weight:700;font-size:13px;padding:4px 10px;border-radius:999px">Net +$95</span></div>
        </div>

        <div style="background:#e8f0ea;border-radius:11px;padding:14px 16px;display:flex;justify-content:space-between;align-items:center;margin-top:2px">
          <div><div style="font-size:13px;text-transform:uppercase;letter-spacing:.1em;color:#5d6b5f">Sweep everything</div><div style="font-size:13.5px;color:#5d6b5f;margin-top:2px">$300 + $80 + $40 + $100</div></div>
          <div style="text-align:right"><div style="font-family:'Playfair Display',Georgia,serif;font-weight:700;font-size:30px;color:#1c5540;line-height:1">$520</div><div style="font-size:13px;color:#2f7256;font-weight:700">net +$305</div></div>
        </div>

      </div>
    </div>`,
  app: `<p style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;line-height:1.4;text-align:center;color:#1c5540;margin:6px 8px 22px">Live scores, win probability, and the full ruleset — in your pocket. No download, no login.</p>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Start</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Five Steps to a Scorecard</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">1</span><span>Tap the <span style="color:#2f7256;font-weight:700">Leaderboard</span> tab up top — you're already in the app, nothing to download or log in.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">2</span><span>The <span style="color:#2f7256;font-weight:700">Leaderboard</span> shows the team score up top and every match below.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">3</span><span>Scroll to your session, then <span style="color:#2f7256;font-weight:700">tap your match row</span> to open your scorecard.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">4</span><span>After each hole, tap your score box and type your <span style="color:#2f7256;font-weight:700">gross score</span>. It saves automatically — no button to press.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">5</span><span>Tap <span style="color:#2f7256;font-weight:700">←</span> to return to the Leaderboard anytime.</span></li>
      </ul></div>
    </div>
    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Leaderboard</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Finding Your Match</h2>
      </div>
      <div style="padding:6px 18px 8px">
        <p style="margin:10px 2px 4px;font-size:15.5px">Matches are grouped into <b>Sessions</b> (named rounds). Scroll to your session and look for your name. Each row shows the two sides, a status in the middle, and a color for who's ahead.</p>
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">•</span><span>Match hasn't started yet</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">A/S</span><span>All square — tied right now</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">thru&nbsp;9</span><span>In progress — 9 holes played</span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">F</span><span>Finished</span></li>
        </ul>
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Green background</span> = Team 1 leading · <span style="color:#b23b35;font-weight:700">Red</span> = Team 2 leading · neutral = all square.</span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span>Tap any row for the full scorecard, or open a shared link like <span style="color:#2f7256;font-weight:700">/match/M001</span>.</span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Scoring</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Entering Scores</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">1</span><span>Open your match from the Leaderboard — you'll see two grids, <span style="color:#2f7256;font-weight:700">Front 9</span> and <span style="color:#2f7256;font-weight:700">Back 9</span>.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">2</span><span>Find your row, tap the box under the hole you just finished.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">3</span><span>Type your <span style="color:#2f7256;font-weight:700">gross score</span> — actual strokes, penalties included. The app does handicaps for you.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">4</span><span>You'll see <span style="color:#2f7256;font-weight:700">Saving…</span> then <span style="color:#2f7256;font-weight:700">Saved</span>. That's it.</span></li>
      </ul>
      <ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">No Save button, no lock step.</span> Every entry saves instantly and can be edited — just retype to overwrite.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Two people, one box?</span> Last to reach the server wins, with no warning. Agree up front on who's entering scores.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Handicap dots</span> by your name: ● = 1 stroke on that hole, ●● = 2. Still enter raw gross — the app computes net.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Status row</span> under the cells: <b>AS</b> all square · <b>3↑</b> Team 1 three up · <b>2↓</b> Team 2 two up.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Results</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">How Matches Close</h2>
      </div>
      <div style="padding:6px 18px 8px">
        <p style="margin:10px 2px 4px;font-size:15.5px">A match ends automatically the moment the leader can't be mathematically caught — nobody marks it done. A banner shows the result, e.g. <b>"Matt wins · 3&amp;2"</b> or <b>"Match Halved."</b></p>
        <ul style="list-style:none;margin:0;padding:0">
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">3&amp;2</span><span>Won with a 3-hole lead, 2 to play — over early</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">1&nbsp;UP</span><span>Won by 1 hole after all 18</span></li>
          <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">HALVED</span><span>Tied after 18 (also shows as A/S)</span></li>
          <li style="padding:14px 2px;display:flex;gap:12px"><span style="flex:0 0 auto;line-height:1.4;font-weight:700;color:#2f7256">F</span><span>Finished — see the banner for the full result</span></li>
        </ul>
      </div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Standings</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Leaderboard &amp; Win Probability</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Score banner</span> shows overall points (e.g. 12–8) over a progress bar: <b>solid fill</b> = locked-in points from finished matches, <b>light fill</b> = projected points from matches still going, <b>center line</b> = the winning threshold.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Win probability</span> (the two %s) weighs how far ahead a team is against points still on the board. A 2-point cushion late ≈ ~95%. A gut-check, not a guarantee.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Points:</span> win = 1 · halved = ½ each · loss = 0. Board refreshes every 15 seconds.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Match Momentum</span> (worm chart, below each scorecard): rides above center when Team 1 leads, below when Team 2 leads, flat when all square.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Best Golfer</span> ranks the top 5 individuals — weighted 50% net strokes, 35% match points, 15% birdies (Rtg / Pts / Net / Brd).</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Help</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">FAQ &amp; Troubleshooting</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">"Save failed."</span> The number shows on your screen but didn't reach the server. Get signal and retype — leave the page first and it's lost.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Scores look stale.</span> It refreshes every 15s — wait a beat, or pull down to reload.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Can't find your match.</span> Scroll past the other sessions. Still missing? The organizer may not have entered it yet.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Wrong score.</span> Tap the box and retype — it overwrites instantly. No confirm step.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Match ended before 18.</span> That's match play — it closes when the leader can't be caught (4 up, 3 to play = done). The result stands.</span></li>
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">No wifi?</span> You can view everything from cache, but you can't <i>save</i> scores without a connection. Find signal before entering.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Handicaps</span> are entered by the organizer beforehand; the app applies the USGA formula per hole automatically.</span></li>
      </ul></div>
    </div>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Heads-Up</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Confirm Before You Tee</h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Pick a scorekeeper.</span> The app has no assignments — agree on one person per match so you don't fight the last-write-wins rule.</span></li>
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Max score isn't enforced.</span> The app accepts any gross 1–15, so apply the double-par cap (Rule III) yourself.</span></li>
      </ul></div>
    </div>`,
  roster: `<p style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;line-height:1.4;text-align:center;color:#1c5540;margin:6px 8px 22px">Every boy, one tap away.</p>

    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#1c5540;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">20 Boys</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">The Field<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Teams drafted Thursday night · tap a number to call</small></h2>
      </div>
      <ul style="list-style:none;margin:0;padding:6px 18px 10px">
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">PJ McGovern</span><a href="tel:+15164598974" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 459-8974</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Matt Eulau</span><a href="tel:+16468084950" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(646) 808-4950</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Sean Norton</span><a href="tel:+15164562443" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 456-2443</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Sean Billings</span><a href="tel:+17046198207" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(704) 619-8207</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Sam O'Neil</span><a href="tel:+13177011854" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(317) 701-1854</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Mat McGovern</span><a href="tel:+15164341863" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 434-1863</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Ryan Norton</span><a href="tel:+15165542143" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 554-2143</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Cam Signorelli</span><a href="tel:+15188591626" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(518) 859-1626</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Liam Treacy</span><a href="tel:+14016993933" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(401) 699-3933</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Eric Eulau</span><a href="tel:+16468317591" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(646) 831-7591</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Wayne Yuan</span><a href="tel:+13316451221" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(331) 645-1221</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Pat Brady</span><a href="tel:+19148263455" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(914) 826-3455</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">AJ Core</span><a href="tel:+15163765916" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 376-5916</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Scott Mongiardo</span><a href="tel:+15164101063" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 410-1063</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Dr. John Santucci</span><a href="tel:+15166800594" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(516) 680-0594</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Alex Marbury</span><a href="tel:+17047788522" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(704) 778-8522</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Declan Sander</span><a href="tel:+18184548252" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(818) 454-8252</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Steve Aston</span><a href="tel:+15086413751" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(508) 641-3751</a></li>
        <li style="padding:13px 2px;border-bottom:1px solid rgba(14,58,41,.14);display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Kevin Nash</span><a href="tel:+17818542850" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(781) 854-2850</a></li>
        <li style="padding:13px 2px;display:flex;justify-content:space-between;align-items:center;gap:10px"><span style="font-weight:600;color:#1c2b22;font-size:16px">Chris Langone <span style="color:#9aa39a;font-weight:400;font-size:12.5px;font-style:italic">· Sat only</span></span><a href="tel:+12016558347" style="flex:0 0 auto;color:#1c5540;text-decoration:none;font-weight:700;font-size:14px;font-variant-numeric:tabular-nums">(201) 655-8347</a></li>
      </ul>
    </div>`,
  lodging: `<p style="font-family:'Playfair Display',Georgia,serif;font-style:italic;font-size:20px;line-height:1.4;text-align:center;color:#1c5540;margin:6px 8px 22px">Home base for the weekend.</p>
    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#efe14e;color:#0e3a29;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">The House</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Airbnb<small style="display:block;font-family:'Iowan Old Style',Palatino,Georgia,serif;font-style:normal;font-size:12.5px;letter-spacing:.05em;color:#5d6b5f;font-weight:400;margin-top:3px">Check-in Thu 4:00 PM · Check-out Sun 9–10 AM</small></h2>
      </div>
      <div style="padding:6px 18px 8px"><ul style="list-style:none;margin:0;padding:0">
        <li style="padding:14px 2px;display:flex;gap:12px"><span style="color:#bcae5b;font-weight:700;flex:0 0 auto;line-height:1.4">—</span><span><span style="color:#2f7256;font-weight:700">Address.</span> 58 Pyngyp Road, Stony Point, NY 10980</span></li>
      </ul></div>
    </div>
    <div style="background:#fffdf7;border:1px solid rgba(14,58,41,.14);border-radius:14px;box-shadow:0 10px 30px -18px rgba(14,58,41,.55);margin:0 0 18px;overflow:hidden">
      <div style="display:flex;align-items:center;gap:14px;padding:16px 18px;border-bottom:1px solid rgba(14,58,41,.14);background:linear-gradient(180deg,#fffdf7,#fbf7ea)">
        <span style="flex:0 0 auto;background:#0e3a29;color:#f3ecd9;text-transform:uppercase;letter-spacing:.12em;font-size:12px;font-weight:600;padding:6px 11px;border-radius:7px;white-space:nowrap">Rooms</span>
        <h2 style="font-family:'Playfair Display',Georgia,serif;font-weight:700;color:#1c5540;font-size:21px;line-height:1.1;margin:0">Sleeping Arrangements</h2>
      </div>
      <div style="text-align:center;padding:30px 18px;color:#5d6b5f">
        <span style="font-family:'Playfair Display',Georgia,serif;font-style:italic;color:#bcae5b;font-size:28px;display:block;margin-bottom:8px">🛏️</span>
        <h3 style="font-family:'Playfair Display',Georgia,serif;color:#1c5540;font-size:22px;margin:0 0 8px">To be assigned</h3>
        <p style="font-size:14.5px">Send me the room / bed breakdown and who's where, and I'll lay it out here.</p>
      </div>
    </div>`,
}

const TABS = [
  { id: 'schedule', label: 'Schedule' },
  { id: 'rules', label: 'Rules' },
  { id: 'wagers', label: 'Wagers' },
  { id: 'app', label: 'The App' },
  { id: 'roster', label: 'Roster' },
  { id: 'lodging', label: 'Lodging' },
]

export function Manual() {
  const [active, setActive] = useState('schedule')

  const go = (id: string) => {
    setActive(id)
    requestAnimationFrame(() => {
      try { window.scrollTo({ top: 0, behavior: 'smooth' }) } catch { window.scrollTo(0, 0) }
    })
  }

  return (
    <div
      style={{
        background: '#f3ecd9',
        minHeight: '100vh',
        color: '#19271f',
        fontFamily: "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, serif",
        fontSize: 17,
        lineHeight: 1.5,
      }}
    >
      <header
        style={{
          background: 'linear-gradient(170deg,#0c3324 0%,#10422f 55%,#0e3a29 100%)',
          color: '#f3ecd9',
          textAlign: 'center',
          padding: '18px 20px 16px',
          borderBottom: '2px solid rgba(239,225,78,.25)',
        }}
      >
        <h1
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontStyle: 'italic',
            fontWeight: 700,
            color: '#efe14e',
            fontSize: 34,
            lineHeight: 1.02,
            margin: 0,
            letterSpacing: '.01em',
          }}
        >
          The Ferda Invitational
        </h1>
        <p style={{ fontSize: 13, letterSpacing: '.04em', color: 'rgba(243,236,217,.78)', margin: '7px 0 0' }}>
          July 9–12, 2026 · Stony Point, New York
        </p>
      </header>

      <TabNav />

      <nav
        aria-label="Manual sections"
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: '#0e3a29',
          display: 'flex',
          justifyContent: 'center',
          gap: 2,
          overflowX: 'auto',
          borderBottom: '1px solid rgba(0,0,0,.3)',
        }}
      >
        {TABS.map((t) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              onClick={() => go(t.id)}
              style={{
                flex: '0 0 auto',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                textTransform: 'uppercase',
                letterSpacing: '.16em',
                fontSize: 12.5,
                padding: '14px 16px 12px',
                position: 'relative',
                whiteSpace: 'nowrap',
                minHeight: 44,
                color: on ? '#efe14e' : 'rgba(243,236,217,.55)',
              }}
            >
              {t.label}
              {on && (
                <span
                  style={{
                    position: 'absolute',
                    left: 12,
                    right: 12,
                    bottom: 0,
                    height: 2,
                    background: '#efe14e',
                    borderRadius: 2,
                  }}
                />
              )}
            </button>
          )
        })}
      </nav>

      <main style={{ maxWidth: 680, margin: '0 auto', padding: '22px 16px 64px' }}>
        <div dangerouslySetInnerHTML={{ __html: CONTENT[active] }} />
        <footer
          style={{ textAlign: 'center', color: '#5d6b5f', fontSize: 12.5, padding: '8px 16px 40px', letterSpacing: '.04em' }}
        >
          The Ferda Invitational · Inaugural Year · MMXXVI
        </footer>
      </main>
    </div>
  )
}
