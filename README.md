# Bracket

Familiar Matrix client thats strictly yours and simply works. Built with SvelteKit and Matrix JS SDK.

Matrix spec recommendations don't matter, UX does. Opinions don't matter, what users want does.

# Project structure

* lib:
  * components/: Reusable UI components
    * ui/: UI libraries \[shadcn]
    * rest is manually built components
  * modules/: \[for the most part] stateless modules
    * matrix/: individual modules for different parts of the Matrix functionality, by file name
      * client: the main matrix client instance with state!!
    * everything else is self-descriptive
