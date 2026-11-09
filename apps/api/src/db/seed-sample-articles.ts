import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import dotenv from 'dotenv'
import { MongoClient } from 'mongodb'
import { estimateReadTimeMinutes } from '@nimink/shared'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') })

const uri = process.env.MONGODB_URI
if (!uri) throw new Error('MONGODB_URI is required to seed sample articles')

const databaseName = process.env.MONGODB_DATABASE || 'nimink'
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 10_000 })

const samples = [
  {
    key: 'nimink-sample-article-01',
    title: 'A Small Guide to Finding Your Writing Rhythm',
    body: `A writing habit does not have to begin with a perfect desk, a free afternoon, or a burst of inspiration. It can begin with ten quiet minutes and one question you genuinely want to answer.

## Make the first step easy

Choose a regular moment that already exists in your day: after breakfast, before checking messages, or during a commute. Keep a note nearby and write down ideas as they arrive. The goal is to make starting familiar, not to force yourself to produce something brilliant every time.

## Separate drafting from editing

When every sentence must be polished on the first pass, the blank page gets heavier. Try writing a rough version without correcting it. Leave a marker where you get stuck and keep moving. Once the main thought is on the page, editing becomes a clearer and less intimidating job.

## Finish with a small promise

Before you stop, write one sentence about what you will do next. It might be “add an example” or “explain this term.” Tomorrow, you can return to a clear next step instead of having to rediscover the whole idea.

Your rhythm will change from week to week. A routine is useful when it helps you return, not when it becomes another standard to fail. Keep the practice small enough to repeat, and let the body of work grow one honest session at a time.`,
    tags: ['writing', 'creativity', 'habits'],
    quizJson: { question: 'What is a helpful way to end a writing session?', options: ['Rewrite the whole draft', 'Leave a clear next step for later', 'Wait for inspiration'], correctIndex: 1 },
  },
  {
    key: 'nimink-sample-article-02',
    title: 'How to Turn a Curious Question into a Useful Article',
    body: `Many good articles begin with a question that will not leave you alone. The challenge is shaping that curiosity into something a reader can follow and use.

## Narrow the question

“How does gardening work?” is too wide for one short article. “What should a first-time balcony gardener plant in a shaded corner?” gives you a reader, a setting, and a practical decision. A focused question helps you decide what belongs in the draft and what can wait for another day.

## Find the reader’s starting point

Imagine the person who will open the article. What do they already know? What word or step might confuse them? Begin with enough context to make the advice understandable, then move toward the part they came to learn.

## Build a simple path

Write down three to five steps in the order a reader needs them. Add one example where an idea could feel abstract. If you are making a recommendation, explain the reason behind it and mention a reasonable alternative when one exists.

## Check the promise

After drafting, compare the title and introduction with the ending. Did the article answer the question it raised? Remove detours that do not support that answer. A useful article does not need to cover everything; it needs to leave the reader with a clearer understanding or a next action.

Curiosity supplies the energy. A precise question gives it direction, and a thoughtful structure makes the result easier to share.`,
    tags: ['writing', 'research', 'learning'],
    quizJson: { question: 'What does narrowing an article question help you do?', options: ['Include every related topic', 'Decide what belongs in the draft', 'Avoid giving examples'], correctIndex: 1 },
  },
  {
    key: 'nimink-sample-article-03',
    title: 'The Case for Clear, Friendly Technical Writing',
    body: `Technical writing is often treated as a test of how many specialist terms a person can fit into a paragraph. In practice, the best explanation is the one that helps someone understand what to do and why it matters.

## Start with the reader’s task

Before explaining a feature, state the problem it solves. A reader setting up a wallet wants to know what information is needed, what action they should take, and what will happen next. That is a more useful starting point than a long list of internal system details.

## Explain unfamiliar terms in place

Some technical words are necessary. Introduce them when they become useful and define them briefly. Prefer a concrete example over a second definition. If a term appears only once and adds no clarity, ordinary language may work better.

## Make instructions testable

Use one action per step. Tell readers what result to expect so they can tell whether the step worked. If a mistake is common, explain how to recover without making the reader feel at fault.

## Keep the important caveats

Clear writing does not mean hiding complexity. If an action can fail, take time, or involve a cost, say so directly. Put that information near the choice it affects instead of burying it at the end.

Friendly technical writing respects the reader’s time and attention. It makes complicated work approachable while keeping the details people need to make sound decisions.`,
    tags: ['technology', 'communication', 'design'],
    quizJson: { question: 'Where should an important caveat appear?', options: ['Near the choice it affects', 'Only in a glossary', 'After all instructions'], correctIndex: 0 },
  },
  {
    key: 'nimink-sample-article-04',
    title: 'A Better Way to Give Feedback on a Draft',
    body: `Good feedback helps a writer see the next useful revision. It is not a score for the person who wrote the draft, and it does not need to fix every sentence in one sitting.

## Ask what kind of feedback is wanted

The writer may be testing the main idea, checking the structure, or preparing a final copy. Ask which of those matters most right now. This keeps comments relevant and prevents line edits from taking over when the central question is whether the article makes sense.

## Describe the reader experience

Instead of saying “this is confusing,” point to the moment where you lost the thread. Explain what you expected to learn and what information would help. Specific observations give the writer something they can investigate.

## Balance strengths with priorities

Name a detail that is working, such as a clear example or a strong opening. Then choose one or two changes that would make the largest difference. A long list of small preferences can obscure the most important revision.

## Leave room for the writer

Offer questions and options instead of rewriting the piece in your own voice. The writer understands their purpose and audience. Your role is to help them see how the draft is landing and where they might take it next.

Useful feedback is honest, kind, and focused. It treats revision as shared problem-solving and helps the writer keep ownership of the work.`,
    tags: ['writing', 'community', 'editing'],
    quizJson: { question: 'Why should a reviewer focus on one or two priorities?', options: ['To avoid reading the whole draft', 'So the biggest improvements stay clear', 'To make the writer agree'], correctIndex: 1 },
  },
  {
    key: 'nimink-sample-article-05',
    title: 'Building Trust in a Small Online Community',
    body: `A small online community can feel personal in the best way: people recognize each other, share work in progress, and return to conversations over time. That closeness grows when participation feels safe and expectations are clear.

## Make the basics visible

Explain what the space is for, how members can take part, and what behavior is not welcome. Short, plain guidelines are easier to remember than a long policy hidden behind several links. Apply them consistently, including when a popular member crosses a line.

## Give people ways to contribute

Not everyone wants to publish a long post or speak first in a busy thread. Offer simple prompts, thoughtful questions, and a way to respond to someone else’s work. Small contributions often help new members feel that they belong.

## Recognize care, not only activity

Fast replies and high post counts do not always signal a healthy community. Notice when people explain an idea patiently, credit a source, or welcome a newcomer. These actions show what the group values and encourage others to do the same.

## Handle problems with care

When conflict happens, address the specific behavior and explain the next step. Give people a clear way to ask questions or appeal a decision. Privacy matters too: do not turn an individual problem into public entertainment.

Trust is built through many ordinary choices. A clear welcome, fair moderation, and generous participation give a community room to grow without losing its human scale.`,
    tags: ['community', 'trust', 'moderation'],
    quizJson: { question: 'What kind of behavior should a community recognize?', options: ['Only posting frequently', 'Careful and welcoming participation', 'Starting public arguments'], correctIndex: 1 },
  },
]

await client.connect()
try {
  const database = client.db(databaseName)
  const users = await database.collection<any>('users').find({}).sort({ createdAt: 1 }).toArray()
  const author = users.find((user) => !String(user.address || '').startsWith('NQ00 DEMO '))
  if (!author) throw new Error('No registered Nimiq account exists in MongoDB yet')

  const articles = database.collection<any>('articles')
  const now = Date.now()
  let inserted = 0
  for (let index = 0; index < samples.length; index++) {
    const sample = samples[index]
    if (await articles.findOne({ sampleSeedKey: sample.key })) continue
    const wordCount = sample.body.trim().split(/\s+/).length
    const createdAt = new Date(now - (samples.length - index) * 60_000)
    await articles.insertOne({
      id: randomUUID(), sampleSeedKey: sample.key, authorId: author.id,
      title: sample.title, body: sample.body, tags: sample.tags, wordCount,
      readTimeMinutes: estimateReadTimeMinutes(wordCount), quizJson: sample.quizJson,
      status: 'published', accessType: 'free', priceLuna: 0,
      createdAt, updatedAt: createdAt, totalTipsLuna: 0, verifiedReadCount: 0,
    })
    inserted++
  }

  console.log(JSON.stringify({ inserted, sampleArticles: samples.length, author: author.displayName || 'registered account', database: databaseName }))
} finally {
  await client.close()
}
