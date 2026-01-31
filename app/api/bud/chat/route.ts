// app/api/bud/chat/route.ts
import { NextResponse } from 'next/server';

type BudRequestBody = {
  role?: 'buyer' | 'distributor' | 'founder';
  locationName?: string;
  question?: string;
};

// Simple rule-based Bud AI stub (no external AI / DB).
// POST /api/bud/chat
// Body: { role?: 'buyer'|'distributor'|'founder', locationName?: string, question?: string }
//
// Returns a Bud-style answer and a few suggestions.
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => null)) as BudRequestBody | null;
    const role = body?.role ?? 'founder';
    const locationName = body?.locationName ?? 'this restaurant';
    const question = body?.question?.trim() || '';

    let answer = '';
    const suggestions: string[] = [];

    // Very simple branching logic based on role + question keywords.
    if (role === 'buyer') {
      if (/par|on hand|order|tonight/i.test(question)) {
        answer =
          `For ${locationName}, I would double-check high-volume items and anything with low on-hand ` +
          `against your par levels. If any item is more than 75% below par, bump up the order slightly ` +
          `to avoid last-minute shortages.`;
        suggestions.push(
          'Review items marked as pinned in your Buyer portal and confirm their quantities.',
          'Check any items with a long lead time and prioritize those in tonight’s order.',
          'If you have time, scan high-dollar items (proteins, liquor) for count accuracy.'
        );
      } else {
        answer =
          `From a buyer perspective at ${locationName}, the main risk is under-ordering ` +
          `critical items and over-ordering slow movers. Ask me about specific SKUs or categories, ` +
          `and I’ll suggest adjustments.`;
        suggestions.push(
          'Ask: “Which items look at risk of running out tonight?”',
          'Ask: “Where am I over par that could lead to waste?”'
        );
      }
    } else if (role === 'distributor') {
      if (/pricing|price|update/i.test(question)) {
        answer =
          `For your weekly pricing, focus first on items flagged as "needs update" or "missing". ` +
          `Those gaps create uncertainty for ${locationName} and can exclude items from the auction.`;
        suggestions.push(
          'Update prices for all missing SKUs before Monday 9:00am.',
          'Review high-volume or high-margin SKUs first, so the most important items are never missing.',
          'Establish a recurring calendar reminder for price updates each Sunday or Monday morning.'
        );
      } else {
        answer =
          `From a distributor standpoint, your reliability is measured by how quickly and consistently ` +
          `you maintain complete pricing coverage. Clear, up-to-date prices make you the default choice for ${locationName}.`;
        suggestions.push(
          'Ask: “Which SKUs are most often missing prices?”',
          'Ask: “How can I reduce pricing gaps week over week?”'
        );
      }
    } else {
      // founder (default)
      if (/risk|ready|readiness|tonight/i.test(question)) {
        answer =
          `For ${locationName}, I’d look at three lenses: items below par, missing or outdated prices, ` +
          `and any unusual patterns in order volume. If all three are under control, tonight’s auction risk is low.`;
        suggestions.push(
          'Review the founder dashboard for items needing order and pricing coverage.',
          'Ask managers to confirm any items that are both high-cost and low on hand.',
          'If something looks off, consider tightening which SKUs participate in tonight’s auction.'
        );
      } else {
        answer =
          `As founder, think of Bud as your operating assistant across all restaurants. ` +
          `Ask Bud about readiness per location, pricing reliability, and where your team might need extra support.`;
        suggestions.push(
          'Ask: “Which location looks riskiest tonight and why?”',
          'Ask: “How can I standardize ordering across both restaurants?”'
        );
      }
    }

    // If no question is provided, give a generic welcome.
    if (!question) {
      answer =
        `I’m Bud, your Restockr assistant. I can help you reason about inventory, pricing, and ` +
        `readiness for ${locationName}. Tell me your role and ask a question like “Where is my biggest risk tonight?”`;
      suggestions.push(
        'Ask: “What should I double-check before sending tonight’s order?”',
        'Ask: “Are my prices complete for this week?”'
      );
    }

    return NextResponse.json(
      {
        success: true,
        role,
        locationName,
        answer,
        suggestions,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('❌ Error in /api/bud/chat:', err);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to process Bud request (internal error).',
      },
      { status: 500 }
    );
  }
}
