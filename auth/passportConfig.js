const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("../models/User");

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CALLBACK_URL,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ googleId: profile.id });
        if (!user) {
            const username = profile.emails[0].value.split('@')[0]; 
          user = await User.create({
            googleId: profile.id,
            email: profile.emails[0].value,
            name: profile.displayName,
            username: username,  // Set the generated username
            password: 'password',  // You may not need password as this is OAuth-based login
            canvases: [],

          });
          await user.save();
        }
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id);
  done(null, user);
});

// Redirect to the dashboard after login
// app.get("/auth/google/callback", passport.authenticate("google", {
//     failureRedirect: "/login"
// }), (req, res) => {
//     res.redirect("/dashboard");  // Redirect to dashboard on successful login
// });

