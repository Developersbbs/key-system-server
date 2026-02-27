require("dotenv").config();
const mongoose = require("mongoose");
const Subscription = require("./models/Subscription");
const User = require("./models/User");

mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(async () => {
    const subs = await Subscription.find().populate('user', 'name email phone').sort({createdAt:-1});
    console.log(JSON.stringify(subs, null, 2));
    process.exit(0);
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
