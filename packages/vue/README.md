# repluggable

The core idea comes from [Repluggable](https://github.com/wix/repluggable), is a awesome library that's implementing inversion of control for front end applications and makes development of medium or high-complexity projects much easier.

Repluggable integrates the React + Redux development pattern internally, which is great, it works out of the box for people developing with this pattern, but it also increases the burden of the package in some cases (for example I might use Vue Waiting for the framework to do some development work, but I also want to use Repluggable!), but fortunately, Repluggable completely decouples the two internally, which allows me to easily extract its core logic and customize it (Cheers for WIX 🥳 !), so there is this project.
