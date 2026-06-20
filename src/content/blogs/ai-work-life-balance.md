---
title: AI Made Coding Faster, But My Day Harder to End
description: Some thoughts on AI coding tools, mythical work-life balance, and why feeling done is harder now.
publishedAt: 2026-06-20
tags: ["AI", "Career"]
slug: ai-work-life-balance
---

I have been thinking about AI and the _mythical_ "work-life balance" lately. Not in the "AI will take our jobs" way, and not
even in the usual productivity discourse way. More like this: when someone says their work-life balance got so much better
after AI, I squint a little.

Maybe that is true for them. I can believe AI makes some work faster, easier, or less annoying. For me, the tradeoff is more
boring: AI makes it harder to know when my day is done.

The best way I can describe it is that **AI changes the shape of unfinished work**. It creates more velocity, but also more
unresolved review and ownership debt. The code moves faster, but the end of the day feels less clean.

## Before AI

Before AI, my day had a pretty clear shape. I gathered requirements, implemented the feature, got stuck, figured it out,
tested it, ran the app, threw in some `console.log()` calls like a professional, implemented some more, and eventually the
feature was done. Not always cleanly, not always perfectly, but I knew where I was.

If I stopped at 5pm, I usually knew what tomorrow looked like:

```txt
todo tomorrow:
- fix the empty state
- clean up the test
- ask product about the edge case
```

That was enough. My brain could close the tab.

## With AI

With AI, the shape is different. I still gather requirements, understand the problem, test the result, and ship something that
works. But I might not be the one writing every line anymore. Sometimes I write the prompt, the agent edits files, I review
the diff, something feels off, I re-prompt, it fixes one thing and changes another thing, then I run the app and review again.

This is useful but man, annoyingly so, it is also work.

Before, the work was mostly:

- understand the problem
- write the code
- debug the code
- test the code

Now, some of the work becomes:

- explain the problem clearly enough
- wait for output
- review code I did not write
- decide whether I trust the output
- figure out what I actually understand

I am not saying this is wrong as there is no right or wrong here. It is more like a spectrum. Sometimes AI is the Tab key.
Sometimes AI is a rubber duck. And most surprisingly-unsurprising these days, AI can be three attention-seekers at the same
time, because apparently I asked for this.

Each point on that spectrum changes what `done` feels like.

## Done, but not done

With AI, I can get to a working feature faster, but sometimes I do not feel like _I_ got there. The tests pass, the UI looks
right, the diff is reasonable, but there is still this lingering feeling:

> Wait, what is going on here?

It is not that I need to understand every line before moving on, as I do not think that is realistic even without AI. Most of
the time, I understand the task, the context, and the pattern the AI is trying to follow. The problem is the volume and
confidence of the output. Confidence is probably easier to tolerate in a greenfield project with tests, but brownfield is
truly _brown_, if you know what I mean.

If my original understanding of the task is correct, that volume is great. If my understanding is slightly off, AI can produce
a lot of wrong-shaped work very quickly. Now I am not only fixing the original problem, but I am also reviewing, undoing, or
reshaping the work that came after the wrong assumption.

That is the stressful part for me. Not burnout-level stress. More like a small tax that shows up near the end of the day, when
I am trying to decide whether I can take my kids to the park or not.

## Waiting is not rest

AI also adds waiting. Five seconds here, thirty seconds there, a few minutes when an agent is reading files, editing code,
running checks, or confidently exploring the wrong neighborhood of the codebase.

What do I do while I wait? Slack, email, another tab, another prompt, another diff. _Very healthy, very mindful, very demure_.

Then the first thing comes back, and I have to reload that context into my head. This is not rest. It is fragmented work.
Before AI, getting stuck was annoying, but at least I was stuck inside one problem. Now I can be half-in on multiple loops at
once, and that is probably the part that tires me out the most.

## The prompt becomes the work

At first, the prompt is small.

```txt
Add the empty state to this page.
```

Then it gets longer.

```txt
Add the empty state to this page, but follow the existing route loader pattern,
do not introduce client-side fetching, and keep the existing Card component.
```

Then it gets longer again.

```txt
Also check the tag page because it uses the same list component.
Do not change markdown rendering. The BlogItem transition name matters.
Use the existing sort helper. Do not touch the RSS feed.
```

At some point, the prompt is a tiny spec, and that is fine because clear requirements are good, but it changes the rhythm. I
am not just implementing anymore; I am writing instructions, reviewing output, correcting direction, and keeping track of what
the agent knows versus what I know. Some days, that feels great. Some days, it feels like managing a very fast intern who
forgets things.

## The team pressure

The team pressure is not really "what if I do not use AI?" If someone knows a part of the codebase well enough to implement
by hand faster, I think that is completely fine. Please do that. I would love to see it done that way. The pressure is subtler
than that.

Once AI becomes the team norm, the feeling I am describing in this post can start to look, internally, like I am using AI
wrong. If I still want the owner feeling back, am I being too slow? If I need more review time, am I producing less? If I do
not trust the output yet, am I falling behind everyone else?

I am not saying this out loud to teammates. This is just the little pressure tax in my own head, because apparently the code
is not enough; now I also get to have feelings about my relationship with the code. Very cool.

## The old stopping point disappeared

Before AI, stopping was usually obvious enough: the compiler is green, the UI works, the test passes, the code is mine, ship
it or pick it up tomorrow. With AI, the stopping point is fuzzier:

- the agent is still running
- the agent made a change I have not reviewed
- the tests pass, but I do not fully trust the implementation
- the prompt thread contains context I need tomorrow
- the feature works, but I still need to read the diff properly

These are open loops, and open loops are terrible for ending the day. The computer says the task is done, but my brain does
not.

That is the gap: `the agent says done` versus `I say done`.

## This is not anti-AI

I am not anti-AI. I use these tools, and they help. They are great for repetitive edits, boring scaffolding, searching a
codebase, writing a first pass, or getting unstuck on something I already know how to verify. There are days where AI saves me
a lot of time, and there are days where AI turns one task into many small supervision tasks.

That is the tradeoff I care about. Not "is AI good or bad?" More like:

> Did this reduce my work, or did it move my work into prompting, review, and mental bookkeeping?

Those are different things.

## What I am trying

I do not have a perfect answer. I am still figuring it out. I try not to start long-running agent work near the end of the day
because the agent might finish in five minutes, or it might not, and now I have a pending loop sitting there like a little
productivity grenade.

I also write a handoff note before I stop.

```txt
where I stopped:
- agent implemented the empty state
- I reviewed BlogList and BlogItem
- still need to review tag page and RSS output
- do not trust the generated test yet
```

This separates `the agent says done` from `I say done`. I also try to read the diff before I accept the feeling of progress.
Not every line every time, but enough to know the shape of the change. If I cannot explain the change, I am not done. That
might be the rule.

## Conclusion

AI made some parts of coding faster. I do not think that is controversial anymore. But faster is not the same as easier to put
down. For me, the hard part is the unfinished feeling around the code: the waiting, the prompts, the review, the team pressure,
and the question of whether I understand enough to call it done.

Before AI, I ended the day based on where I left off in my own work. With AI, I have to be more intentional. I need to know
where the agent left off, where I left off, and whether those are the same thing.

That is the work-life balance problem for me. Not whether AI makes me faster. Whether AI lets me stop.

Thanks for reading, and have fun!
