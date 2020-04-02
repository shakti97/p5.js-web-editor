import mongoose from 'mongoose';

const bcrypt = require('bcrypt-nodejs');

const EmailConfirmationStates = {
  Verified: 'verified',
  Sent: 'sent',
  Resent: 'resent',
};

const { Schema } = mongoose;

const apiKeySchema = new Schema({
  label: { type: String, default: 'API Key' },
  lastUsedAt: { type: Date },
  hashedKey: { type: String, required: true },
}, { timestamps: true, _id: true });

apiKeySchema.virtual('id').get(function getApiKeyId() {
  return this._id.toHexString();
});

/**
 * When serialising an APIKey instance, the `hashedKey` field
 * should never be exposed to the client. So we only return
 * a safe list of fields when toObject and toJSON are called.
*/
function apiKeyMetadata(doc, ret, options) {
  return {
    id: doc.id, label: doc.label, lastUsedAt: doc.lastUsedAt, createdAt: doc.createdAt
  };
}

apiKeySchema.set('toObject', {
  transform: apiKeyMetadata
});

apiKeySchema.set('toJSON', {
  virtuals: true,
  transform: apiKeyMetadata
});

const userSchema = new Schema({
  name: { type: String, default: '' },
  username: { type: String, required: true, unique: true },
  password: { type: String },
  resetPasswordToken: String,
  resetPasswordExpires: Date,
  verified: { type: String },
  verifiedToken: String,
  verifiedTokenExpires: Date,
  github: { type: String },
  email: { type: String, unique: true },
  tokens: Array,
  apiKeys: { type: [apiKeySchema] },
  preferences: {
    fontSize: { type: Number, default: 18 },
    lineNumbers: { type: Boolean, default: true },
    indentationAmount: { type: Number, default: 2 },
    isTabIndent: { type: Boolean, default: false },
    autosave: { type: Boolean, default: true },
    linewrap: { type: Boolean, default: true },
    lintWarning: { type: Boolean, default: false },
    textOutput: { type: Boolean, default: false },
    gridOutput: { type: Boolean, default: false },
    soundOutput: { type: Boolean, default: false },
    theme: { type: String, default: 'light' },
    autorefresh: { type: Boolean, default: false }
  },
  totalSize: { type: Number, default: 0 }
}, { timestamps: true, usePushEach: true });

/**
 * Password hash middleware.
 */
userSchema.pre('save', function checkPassword(next) { // eslint-disable-line consistent-return
  const user = this;
  if (!user.isModified('password')) { return next(); }
  bcrypt.genSalt(10, (err, salt) => { // eslint-disable-line consistent-return
    if (err) { return next(err); }
    bcrypt.hash(user.password, salt, null, (innerErr, hash) => {
      if (innerErr) { return next(innerErr); }
      user.password = hash;
      return next();
    });
  });
});

/**
 * API keys hash middleware
 */
userSchema.pre('save', function checkApiKey(next) { // eslint-disable-line consistent-return
  const user = this;
  if (!user.isModified('apiKeys')) { return next(); }
  let hasNew = false;
  user.apiKeys.forEach((k) => {
    if (k.isNew) {
      hasNew = true;
      bcrypt.genSalt(10, (err, salt) => { // eslint-disable-line consistent-return
        if (err) { return next(err); }
        bcrypt.hash(k.hashedKey, salt, null, (innerErr, hash) => {
          if (innerErr) { return next(innerErr); }
          k.hashedKey = hash;
          return next();
        });
      });
    }
  });
  if (!hasNew) return next();
});

userSchema.virtual('id').get(function idToString() {
  return this._id.toHexString();
});

userSchema.set('toJSON', {
  virtuals: true
});

/**
 * Helper method for validating user's password.
 */
userSchema.methods.comparePassword = function comparePassword(candidatePassword, cb) {
// userSchema.methods.comparePassword = (candidatePassword, cb) => {
  bcrypt.compare(candidatePassword, this.password, (err, isMatch) => {
    cb(err, isMatch);
  });
};

/**
 * Helper method for validating a user's api key
 */
userSchema.methods.findMatchingKey = function findMatchingKey(candidateKey, cb) {
  let foundOne = false;
  this.apiKeys.forEach((k) => {
    if (bcrypt.compareSync(candidateKey, k.hashedKey)) {
      foundOne = true;
      cb(null, true, k);
    }
  });
  if (!foundOne) cb('Matching API key not found !', false, null);
};

userSchema.statics.findByMailOrName = function findByMailOrName(email) {
  const query = {
    $or: [{
      email,
    }, {
      username: email,
    }],
  };
  return this.findOne(query).exec();
};

userSchema.statics.EmailConfirmation = EmailConfirmationStates;

export default mongoose.model('User', userSchema);
