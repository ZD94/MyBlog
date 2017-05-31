// 路由全部写在这里
//登录和注册需要的User类
const User = require('../models/user');
const Post = require('../models/post');
const Comment = require('../models/comment');
const crypto = require('crypto');
const multer = require('multer');
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/images')
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname)
    }
})
const upload = multer({storage: storage, size: 10225});

function checkLogin(req, res, next) {
    if (!req.session.user) {
        req.flash('error', '未登录!');
        res.redirect('/login');
    }
    next(); 
}
function checkNotLogin(req, res, next) {
    if (req.session.user) {
        req.flash('error', '已登录!');
        res.redirect('back');
    }
    next();
}

module.exports = function (app) {
    //-------------------------------------首页----------------------------------
    app.get('/', function (req, res) {
        let page = parseInt(req.query.p) || 1;
        Post.getTen(null, page, function (err, posts, total) {
            if (err) {
                posts = [];
            }
            res.render('index', {
                title: '首页',
                user: req.session.user,
                page: page,
                posts: posts,
                isFirstPage: (page - 1) == 0,
                isLastPage: (page - 1) * 10 + posts.length == total,
                success: req.flash('success').toString(),
                error: req.flash('error').toString(),
        })
            console.log(posts)

        })

    })
    //----------------------------------------注册页面的路由-------------------------------
    app.get('/reg', checkNotLogin);
    app.get('/reg', function (req, res) {
        res.render('reg', {
            title: '注册',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    })
    //-----------------------------------注册行为-------------------------------
    app.post('/reg', checkNotLogin);
    app.post('/reg', function (req, res) {

        let name = req.body.name;
        let password = req.body.password;
        let password_re = req.body['password_re'];
        let email = req.body.email;
        if (name == '' || password == '' || password_re == '' || email == '') {
            req.flash('error', '请正确填写信息');
            return res.redirect('/reg');
        }

        if (password_re != password) {
            req.flash('error', '用户两次输入的密码不一样');
            return res.redirect('/reg');
        }
        let md5 = crypto.createHash('md5');
            password = md5.update(req.body.password).digest('hex');

        let newUser = new User({
            name: name,
            password: password,
            email: email
        });
        User.get(newUser.name, function (err, user) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            if (user) {
                req.flash('error', '用户名已经存在');
                return res.redirect('/reg');
            }
            newUser.save(function (err, user) {
                if (err) {
                    req.flash('error', err);
                }
                req.session.user = newUser;
                req.flash('success', '注册成功');
                res.redirect('/');
            })
        })
    })
    //-----------------------------------登录-----------------------------------
    app.get('/login', checkNotLogin);
    app.get('/login', function (req, res) {
        res.render('login', {
            title: '登录',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    })
    //------------------------------------登录行为-------------------------------
    app.post('/login', checkNotLogin);
    app.post('/login', function (req, res) {
        let md5 = crypto.createHash('md5');
        let password = md5.update(req.body.password).digest('hex');
        User.get(req.body.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户名不存在');
                return res.redirect('/login');
            }
            if (user.password != password) {
                req.flash('error', '密码错误');
                return res.redirect('/login');
            }
            req.session.user = user;

            req.flash('success', '登录成功');
            res.redirect('/');
        })

    })
    //------------------------------------------发表-----------------------------
    app.get('/post', checkLogin);
    app.get('/post', function (req, res) {
        res.render('post', {
            title: '发表',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    })
    //--------------------------------发表行为------------------------
    app.post('/post', checkLogin);
    app.post('/post', function (req, res) {
        let currentUser = req.session.user;
        if (req.body.title == '' || req.body.post == '') {
            req.flash('error', '内容不能为空');
            return res.redirect('/post');
        }

        let tags = [req.body.tag1, req.body.tag2, req.body.tag3];
        let post = new Post(currentUser.name, req.body.title, tags, req.body.post);
        post.save(function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            req.flash('success', '发布成功');
            res.redirect('/');
        })
    })
    //----------------------------------上传-----------------------------
    app.get('/upload', checkLogin);
    app.get('/upload', function (req, res) {
        res.render('upload', {
            title: '文件上传',
            user: req.session.user,
            success: req.flash('success').toString(),
            error: req.flash('error').toString()
        })
    })
    //----------------------------退出--------------------------------
    app.get('/logout', function (req, res) {
        req.session.user = null;
        req.flash('success', '成功退出');
        res.redirect('/');
    })
    app.get('/u/:name', function (req, res) {
        let page = parseInt(req.query.p) || 1;
        User.get(req.params.name, function (err, user) {
            if (!user) {
                req.flash('error', '用户不存在!');
                return res.redirect('/');
            }
            Post.getTen(user.name, page, function (err, posts, total) {
                if (err) {
                    req.flash('error', err);
                    return res.redirect('/');
                }
                res.render('users', {
                    title: user.name,
                    posts: posts,
                    page: page,
                    isFirstPage: (page - 1) == 0,
                    isLastPage: ((page - 1) * 10 + posts.length) == total,
                    user: req.session.user,
                    success: req.flash('success').toString(),
                    error: req.flash('error').toString()
                });
            });
        });
    });
    //---------------------------------文章详情页面---------------------------------
    app.get('/u/:name/:minute/:title', function (req, res) {
        Post.getOne(req.params.name, req.params.minute, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', '找不到当前文章');
                return res.redirect('/');
            }
            res.render('article', {
                title: req.params.title,
                user: req.session.user,
                post: post,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
    //------------------------------------文章的留言发布-----------------------
    app.post('/comment/:name/:minute/:title',function(req,res){
        var date = new Date();
        var time = date.getFullYear() + "-" + (date.getMonth() + 1) + "-" + date.getDate() + " " +
            date.getHours() + ":" + (date.getMinutes() < 10 ? '0' + date.getMinutes() : date.getMinutes());
        var comment = {
            name:req.body.name,
            time:time,
            content:req.body.content
        }
        var newCommnet = new Comment(req.params.name,req.params.minute,req.params.title,comment);
        newCommnet.save(function(err){
            if(err){
                req.flash('error',err);
                return res.redirect('back');
            }
            req.flash('success','发布成功');
            res.redirect('back');

        })
    })
    //---------------------------------------文章编辑------------------------------------
    app.get('/edit/:name/:minute/:title', checkLogin);
    app.get('/edit/:name/:minute/:title', function (req, res) {
        let currentUser = req.session.user;
        Post.edit(currentUser.name, req.params.minute, req.params.title, function (err, post) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            res.render('edit', {
                title: '编辑文章',
                user: req.session.user,
                post: post,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
    //------------------------------------文章编辑行为--------------------------
    app.post('/edit/:name/:minute/:title', checkLogin);
    app.post('/edit/:name/:minute/:title', function (req, res) {
        Post.update(req.params.name, req.params.minute, req.params.title,
            req.body.post, function (err) {
                let url = encodeURI('/u/' + req.params.name + '/' + req.params.minute + '/' + req.params.title);
                if (err) {
                    req.flash('error', err);
                    return res.redirect(url);
                }
                req.flash('success', '编辑成功');
                return res.redirect(url);
            })
    })
    //-----------------------------文章删除行为---------------------
    app.get('/remove/:name/:minute/:title', checkLogin);
    app.get('/remove/:name/:minute/:title', function (req, res) {
        Post.remove(req.params.name, req.params.minute, req.params.title, function (err) {
            if (err) {
                req.flash('error', err);
                return res.redirect('back');
            }
            req.flash('success', '修改成功');
            res.redirect('/');
        })
    })
    //------------------------------------文章存档------------------------
    app.get('/archive', function (req, res) {
        Post.getArchive(function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('archive', {
                title: '存档',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
            console.log(posts)
        })
    })
    //--------------------------------文章标签页--------------------------
    app.get('/tags', function (req, res) {
        Post.getTags(function (err, posts) {
            if (err) {
                req.flash('error', err);
                res.redirect('/');
            }
            res.render('tags', {
                title: '标签',
                posts: posts,
                user: req.session.user,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
    //------------------标签对应的文章集合---------------------
    app.get('/tags/:tag', function (req, res) {
        Post.getTag(req.params.tag, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('tag', {
                title: 'TAG:' + req.params.tag,
                user: req.session.user,
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
    //----------------------搜索------------------------
    app.get('/search', function (req, res) {
        Post.search(req.query.keyword, function (err, posts) {
            if (err) {
                req.flash('error', err);
                return res.redirect('/');
            }
            res.render('search', {
                title: 'SEARCH :' + req.query.keyword,
                user: req.session.user,
                posts: posts,
                success: req.flash('success').toString(),
                error: req.flash('error').toString()
            })
        })
    })
}