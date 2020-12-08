const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { UserInputError } = require('apollo-server');

const {
  validateRegisterInput,
  validateLoginInput
} = require('../../util/validators');
const { SECRET_KEY } = require('../../config');
const User = require('../../models/User');

function generateToken(user){
  return jwt.sign({
    id: user.id,
    email: user.email,
    username: user.username
  }, SECRET_KEY,{expiresIn:'1h'} );
}
module.exports = {
  Mutation:{
    async login(_, { username, password}){
      const {errors, valid} = validateLoginInput(username, password);

      if(!valid){
        throw new UserInputError('Errors', { errors })
      }
      const user = await User.findOne({ username});

      if(!user){
        errors.general = 'User not found'
        throw new UserInputError('Username not found!', { errors });
      }
      const match = await bcrypt.compare(password, user.password);
      if(!match){
        errors.general = 'wrong credentials'
        throw new UserInputError('Wrong credentials', { errors });
      }

      const token = generateToken(user)
      return{
        ...user._doc,
        id: user._id,
        token
      }
    },
    async register(
      _,
      {
      registerInput : {username, email, password, confirmPassword, firstName, lastName}
    }, 
      context, info){
      //Todo validate user data
      const { valid, errors } = validateRegisterInput(username, email, password, confirmPassword, firstName, lastName)
      if(!valid){
        throw new UserInputError('Errors', { errors })
      }
      // Todo Make sure User doesnt already exist
      const user = await User.findOne({ username});
      if(user){
        throw new UserInputError('Username already exists', {
          errors:{
            username: 'this username is taken'
          }
        })
      }
      // todo hash password and create token
      password = await bcrypt.hash(password, 13);

      const newUser = new User({
        email,
        username,
        password,
        firstName, 
        lastName,
        createdAt: new Date().toISOString()
      });
      const res = await newUser.save();

      const token = generateToken(res)

      return{
        ...res._doc,
        id: res._id,
        token
      };
    },
    
  }
}