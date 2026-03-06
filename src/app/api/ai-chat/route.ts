import { NextRequest, NextResponse } from 'next/server';
import { ai } from '@/ai/genkit';
import { buildSystemPrompt, createProjectTool, type EmployeeInfo } from '@/ai/chat-assistant';
import { getFirebaseAdminFirestore } from '@/firebase/admin';

export const maxDuration = 120;

export async function POST(request: NextRequest) {
  try {
    const { messages, employees } = await request.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'messages array is required' }, { status: 400 });
    }

    const empList: EmployeeInfo[] = Array.isArray(employees) ? employees : [];
    const systemPrompt = buildSystemPrompt(empList);

    console.log(`[ai-chat] ${messages.length} messages, ${empList.length} employees`);

    const result = await ai.generate({
      system: systemPrompt,
      messages,
      tools: [createProjectTool],
      maxTurns: 3,
    });

    const text = result.text || '';
    console.log(`[ai-chat] Response length: ${text.length}`);

    return NextResponse.json({ text });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ai-chat] Error:', msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET() {
  try {
    const db = getFirebaseAdminFirestore();

    const [empSnap, posSnap] = await Promise.all([
      db.collection('employees').get(),
      db.collection('positions').get(),
    ]);

    const posMap = new Map<string, string>();
    posSnap.docs.forEach(doc => {
      const d = doc.data();
      posMap.set(doc.id, d.title || d.name || '');
    });

    const employees: EmployeeInfo[] = empSnap.docs.map(doc => {
      const d = doc.data();
      const first = d.firstName || '';
      const last = d.lastName || '';
      const name = `${last} ${first}`.trim() || d.email || 'Нэргүй';
      return {
        id: doc.id,
        name,
        position: d.positionId ? posMap.get(d.positionId) : undefined,
      };
    });

    return NextResponse.json({ employees });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to fetch employees';
    console.error('[ai-chat/employees] Error:', msg);
    return NextResponse.json({ employees: [], error: msg }, { status: 500 });
  }
}
