const {validationResult} = require('express-validator/check')
const Post = require('../models/post');
const User = require('../models/user');
const io = require('../socket');
const { cloudinary } = require('../cloudinary');


exports.getPosts = async (req, res, next) => {
    //Get the stored posts from the DB
    const errors = validationResult(req)
    //If any errors from validation in the routes, store in 'errors'
    if(!errors.isEmpty()){
        //if 'errors' is not empty, throw an error
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode =422;
        throw error
    }
    const perPage = 3;
    const currentPage = req.query.page || 1;
    //number of posts per page, set current page to the requested page
    try {
    const totalItems = await Post.find().countDocuments()
    //get the number of posts in total
    const posts = await Post.find().populate('creator').sort({createdAt: -1}).skip((currentPage-1)*perPage).limit(perPage)
    //get the posts that should be rendered for the given page, add in data from the User object (referenced by _id)
    //perform this code to completion before moving on
    if(!posts) {
        //if no posts are found on the given page...
        const error = new Error('Could not find post');
        error.statusCode = 404;
        throw error
    }

    res.status(200).json({message: 'Posts found', posts: posts, totalItems: totalItems})
    
    } catch (err) {
        
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.createPost = async (req, res, next) => {
    const errors = validationResult(req)
    if(!errors.isEmpty()){
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode =422;
        throw error
    }

    if(!req.file) {
        const error = new Error('No image provided.')
        error.statusCode = 422;
        throw error;
    }

    let imagePath = ""

    try {
      const uploadedResponse = await cloudinary.uploader.upload(req.file.path, {
        upload_preset: 'dev_setups'
      })
      imagePath = uploadedResponse.url

    } catch(err) {
      console.log(err)
    }

    const imageUrl = imagePath;
    const title = req.body.title;
    const content = req.body.content;

    
    const post = new Post(
        //Create a new post with the following values in the Post model, store in post variable
        {
            title: title, 
            content: content, 
            imageUrl: imageUrl,
            creator: req.userId
        });
    
    try {

        await post.save();
        //save the post to the database, as defined in Post model
        const user = await User.findById(req.userId)
        //find the current user by the user ID in the request
        user.posts.push(post)
        //push current post to the user's array of posts
        await user.save()
        //save the user, updated with reference to the new post 
        io.getIO().emit('posts', { action: 'create', post: {...post._doc, creator: {_id: req.userId, name: user.name}} })
        //update the dom for all active users to include this new post
        res.status(201).json({
            message: 'Post created sucessfully',
            post: post,
            creator: {_id: user._id, name: user.name}
        })
    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }
        
}

exports.getPost = async (req, res, next) => {
    const postId = req.params.postId;
    try {
        const post = await Post.findById(postId)
        //fetch the requested post by the given ID

        if(!post) {
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error
        }

        res.status(200).json({message: 'Post found', post: post})

    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.updatePost = async (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req)

    const userId = (req.userId)

    if(!errors.isEmpty()){
        const error = new Error('Validation failed, entered data is incorrect.')
        error.statusCode =422;
        throw error
    }
    const title = req.body.title;
    const content = req.body.content;
    let imagePath = req.body.image;
    if(req.file) {
        //if the request contains a new image to update the post, set the post to use the new file path
        imagePath = req.file.path;
    }

    if(!imagePath) {
        //if the update nor the original have an image path, throw an error
        const error = new Error('No file picked.');
        error.statusCode = 422;
        throw error;
    }
    try {
        const post  = await Post.findById(postId).populate('creator')
        //find the post to edit

        if(!post){
            //if there is no post with the requested post ID, throw error
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error
            
        }
        if(post.creator._id.toString() !== userId){
            //if the post creator does not have the same ID as the current user, throw an error
            const error = new Error('You cannot edit posts by another user!');
            error.statusCode = 403;
            throw error
        }


        if(req.file) {
            try {
                const uploadedResponse = await cloudinary.uploader.upload(imagePath, {
                    upload_preset: 'dev_setups'
                })
                imagePath = uploadedResponse.url
            } catch(err) {
                console.log(err)
        }}
        

        post.title = title;
        post.imageUrl = imagePath;
        post.content = content;

        //set the post to have the new values of the updated post

        const result = await post.save()

        //store the result of saving the post, per Post model

        io.getIO().emit('posts', { action: 'update', post: result })

        //'emit' new post to currently active users

        res.status(200).json({message: 'Post updated', post: result })
    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }

}

exports.deletePost = async (req, res, next) => {
    const postId = req.params.postId;

    try {
        const post = await Post.findById(postId)

        if(!post){
            const error = new Error('Could not find post');
            error.statusCode = 404;
            throw error
        }
        if(post.creator._id.toString() !== req.userId){
            const error = new Error('You cannot delete posts by another user!');
            error.statusCode = 403;
            throw error
        }
        //Check user logged in

        await Post.findByIdAndRemove(postId)
        const user = await User.findById(req.userId) 
        await user.posts.pull(postId)
        await user.save()
        //update user references to posts to not include deleted post

        io.getIO().emit('posts', { action: 'delete', post: postId })

        res.status(200).json({message: 'Post deleted'})
    } catch (err) {
        if(!err.statusCode){
            err.statusCode = 500;
        }
        next(err);
    }

}
