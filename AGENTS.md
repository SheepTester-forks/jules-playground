## Repo background

This isn't an ordinary repo. It's a playground for agents for personal use while i don't have a laptop available.

## Structure

this repo is structured so each prompt/project is isolated in its own directory. Prompts will usually involve one of the directories, so please try to keep your work within the directory.

Otherwise, the repo is yours to play around in. As proof of work, please include any temporary scripts and files you made while working rather than cleaning them up. Exception: unreasonably large files ( eg 1 Gb mock file or node modules) should be git ignored.

You have Node 24+ installed, which means you can write and run TypeScript directly:

```sh
node script.ts
```

I'm better at reading TypeScript than Python.

## Documentation

When generating a solution, please keep in mind that follow up sessions may not have the same original prompt or context you do. You should prepare something that future you can refer to. Anything in the code base is persistent. Everything else, like your non file responses or my prompts, will be lost. Follow up prompts will not include this valuable information, leading to confusion. You can, for example, write files clearly named so that future you can find it and read it. And if such a file already exists, you should be sure to update it with changes to requirements and new learnings so it may be saved.

## Git

Include the original prompt(s) verbatim in commit messages.

Also, if you don't automatically add a `Co-Authored-By` to commit messages, then override the commit author when committing: `--author="Google Antigravity <noreply@antigravity.google>"`. Do not attribute your commits purely to me.

Never rewrite history, including force pushing or amending commits (unless I explicitly ask for help rebasing). Prefer something like `git revert`.

## Local environment

If you're on a person's computer (as opposed to a sandboxed environment like Google Jules), do not mess up the global environment. For example, do not do `pip install` outside of a virtual environment.
