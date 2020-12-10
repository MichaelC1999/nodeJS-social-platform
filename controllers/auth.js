const User = require('../models/user');
const { validationResult } = require('express-validator/check')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

exports.signup = async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()){
        const error = new Error('Validation failed')
        error.statusCode = 422;
        error.data = errors.array();
        throw error;
    }
    const email = req.body.email;
    const name = req.body.name;
    const password = req.body.password;

    try {
        const hashedPassword = await bcrypt.hash(password, 12)

        //take password input and encrypt it

        const user = new User({
            email: email,
            name: name,
            password: hashedPassword
        })

        //create a new user with User model and store in local user variable

        await user.save()

        res.status(201).json({message: 'User created!', userId: user._id})
    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.login = async (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    let loadedUser;
    try {
        const user = await User.findOne({email: email})
        //find the user by the given email
        if(!user){
            //if user with no email is found
            const error = new Error('Could not find user');
            error.statusCode = 404;
            throw error
        }

        const isEqual = await bcrypt.compare(password, user.password);
        //compares input login password to stored encrypted password
        
        if(!isEqual){
            const error = new Error('Could not find post');
            error.statusCode = 401;
            throw error
        }

        const token = jwt.sign(
            {
                email: user.email, 
                userId: user._id.toString()
            }, 'secret', 
            { expiresIn: '1h'})

        //creates token to identify the current user and email

        res.status(200).json({token: token, userId: user._id.toString()})
        
    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.getStatus = async (req, res, next) => {
    try{
        const user = await User.findById(req.userId)
        if(!user){
            const error = new Error('Could not find user');
            error.statusCode = 401;
            throw error
        }

        //fetch the status of the current user

        res.status(200).json({message: "User status fetched", status: user.status})
    } catch (err){
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}

exports.putStatus = async (req, res, next) => {
    const newStatus = req.body.status;

    try{
        const user = await User.findById(req.userId)
        //find the current user
        if(!user){
            const error = new Error('Could not find user');
            error.statusCode = 401;
            throw error
        }

        user.status = newStatus;
        await user.save();

        //save the new given status as the user's status

        res.status(200).json({message: "User status posted", status: newStatus})
    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
}