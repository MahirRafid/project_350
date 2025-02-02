
require('dotenv').config();
// const product =require('./api/product');
const fs = require('fs');
const readline = require('readline');
const {readFileSync, promises: fsPromises} = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const passport = require('passport');
const passportLocal= require('passport-local');
const passportLocalMongoose= require('passport-local-mongoose');
const ejs= require('ejs');
const session= require('express-session');
const mongoose= require('mongoose');
const findOrCreate= require('mongoose-findorcreate');
const loginRouter = require('./routes/login');
const homeRouter =require('./routes/home');
// const convertFile=require('./utilities/dataEntry');
const colors = require('colors');
const {Parser}=require('json2csv');
const {spawn}=require('child_process');
const path = require('path');
const app =express();
// app.use("/api/product",product);
const timeAgo=require(__dirname +"/public/timeAgo.js");
app.use(bodyParser.urlencoded({extended: true}));

app.set('view engine' , 'ejs');
app.use(express.static('public'));

let MONGO_SERVER_1="BanglaStemmingDB";
let MONGO_SERVER_2="testDB";
// mongoose.connect(MONGO_SERVER_2);
mongoose.connect(process.env.MONGO_SERVER_1)
.then(()=>{
    console.log("Connected to database "+ MONGO_SERVER_1.rainbow)
})
.catch(err=>{
    console.log("Sorry, cannot connect!".red)
    console.log(err)
})

// mongoose.connect("mongodb://localhost:27017/userDB", {useNewUrlParser: true});
//mongoose.set("useCreateIndex", true);

app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

app.use('/home',homeRouter);
app.use('/',loginRouter);




function countWords(username){
    Data.count({usernam:username}, function( err, cnt){
      console.log(username+" has completed total "+cnt)
    return cnt;
});
}
async function makeFree(usr) {
  try{
    let nowCompleted=0;
    // nowCompleted=countWords(usr);
    await User.findOneAndUpdate({username:usr},
                           {$set:{workingWith:0,completed:nowCompleted}},  //  {$set:{completed:nowCompleted,workingWith:0}},
                           {new: true}, (err, doc) => { return doc.save(); });
      
  }
  catch(error){

  }
}
async function updateData(filter,update){
  try{
    await Data.findOneAndUpdate(filter, {$set:update}, {new: true}, (err, doc) => {
     if (err) {
       //  console.log(req.user.username +" fecing problem when updating data! ");
         console.log(" facing problem while updating the word "+doc.word);
     }
     return doc.save();
   });
  }
  catch(err){

  }
}

const User=require('./models/user');

passport.use(User.createStrategy());
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

const Data= require('./models/data');
async function updateData(filter,update){
  try{
    await  Data.findOneAndUpdate(filter,{$set:update},{new: true}, (err, doc) => {});

     doc.save();
    // setTimeout(() => {console.log("Delayed for 1 second.");}, "1000");
     return 1;
  }
  catch(err){
    console.log(err);
  }
}

app.post('/done',function(req,res){
  if(req.isAuthenticated()&&req.user.status=="active"){
    let nowCompleted=req.user.completed+1;
    let usr=req.user.username;

    makeFree(usr);
     // User.findOneAndUpdate({username:usr},
     //                        {$set:{workingWith:0}},  //  {$set:{completed:nowCompleted,workingWith:0}},
     //                        {new: true}, (err, doc) => {});


    const filter={serialNumber : req.body.num}

      let word=req.body.sobdo;
      let root = req.body.rt;
      let inflect=word.replace(root,'');
      if(word[0]!=root[0]){
        inflect=word.replace(root,'__'); //two underscore
      }

      let d=new Date();
      let update ={       //do something
        status:12,
        time1:d
      }; //skip

      if(req.body.whatToDo=='complete'){
        if(word.includes(root)==true && root.length!=0){ //valid
          update={
            rootWord1 :root,
            inflection1 : inflect,
            lock : 0,
            status: 11,  //double complete
            usernam1: req.user.username,
            time1: d
          };
        }
        else{  // invalid root
          update={lock:0};
        }

      }
      else if(req.body.whatToDo=='gerbage'){     //no inflection

          update={
          lock : 0,
          status: 13,
          time1:d
        };
      }

      updateData(filter,update);
    res.redirect('/home');
  }
  else{
    res.redirect('/')
  }
});

app.get('/admin-login',function(req,res){
  res.render('admin_login');
});
app.get('/admin',function(req,res){

  if(req.isAuthenticated() && req.user.role=='admin'){

    let usr=req.user.username;
      Data
      .find({status: 11})
      .sort({'time': -1})
      .limit(10)
      .exec(function(err, posts) {
        res.render('admin',{sobdo:posts,who:usr,page:"lastTen"});
           // `posts` will be of length 20
      });
  }
  else{
    res.redirect('/admin-login');
  }

});



app.get('/my-words',function(req,res){
  if(req.isAuthenticated()&&req.user.status=="active"){
    let usr=req.user.username;
  //  console.log(usr);
      Data
      .find({status: 11,usernam1:usr})
      .sort({'time1': -1})
      .limit(10)
      .exec(function(err, posts) {
        res.render('myWords',{sobdo:posts,who:usr,page:"lastTen"});
           // `posts` will be of length 20
      });
  }
  else{
    res.redirect('/');
  }

});


app.post('/query',function(req,res){
  let lo=req.body.lowerLimit;
  let hi=req.body.upperLimit;
  let usr=req.user.username;
  let filter={status:11,serialNumber: { $gte: lo, $lte: hi }};
  if(usr!='admin_101' && req.user.role!='admin'){
     filter={status:11,usernam1:usr,serialNumber: { $gte: lo, $lte: hi }};
     Data.find(filter,function(err,results){
       res.render('myWords',{sobdo:results, who:usr,page:"query"});
     }).sort({ serialNumber: -1 });
  }
  else{
    Data.find(filter,function(err,results){
      res.render('admin',{sobdo:results, who:usr,page:"query"});
    }).sort({ serialNumber: -1 });
  }

//  console.log('low : '+lo+' high : '+hi);

});
app.get('/register',function(req,res){
  if(req.isAuthenticated() && req.user.role=='admin'){
    res.render('signup');
  }
  else{
    res.redirect('/admin-login');
  }

});

app.post("/register", function(req, res){
  let memberSince=new Date();
  User.register({username : req.body.username, email:req.body.email, createdOn:memberSince}, req.body.password, function(err, user){
    if (err) {
      console.log(err);
      res.redirect("/");
    } else {
      // passport.authenticate("local")(req, res, function(){
      //   res.redirect("/home");
      // });
      res.redirect('/activeDeactive');
    }
  });

});
app.post('/admin-logout',function(req,res){
  req.logout(function(err) {
    if (err) {
      return next(err);
    }
    res.redirect('/admin-login');
  });
});



app.get('/my-profile',function(req,res){
  if(req.isAuthenticated()&&req.user.status=="active"){

    Data.count({usernam1:req.user.username}, function( err, count){
      res.render('profile',{myself:req.user  , cnt:count});
  });
  }
  else{
    res.redirect('/');
  }
});

// reading the file




  const fltr={lock : 1}
  const updt ={ lock : 0};
Data.updateMany(fltr, {$set:updt}, {new: true}, (err, doc) => {});

app.post('/edit',function(req,res){
  if(req.isAuthenticated()&&req.user.status=="active"){
      let tarikh=Date.now();
      let manush=req.user.username;
      let sl=req.body.serialNo;
      let word=req.body.givenWord;
      let rt=req.body.newRoot;
      let inf= word.replace(rt,'');
      if(word[0]!=rt[0]){
        inf=word.replace(rt,'__'); //two underscore
      }
      let filter={serialNumber:sl};
      let update={
                    rootWord1:rt,
                    inflection1:inf,
                    // usernam:manush,
                    //time:tarikh,
                    //status:11 //maybe of no use
                  };
      if (word.includes(rt)==true && rt.length!=0) {

        updateData(filter,update);
        // Data.findOneAndUpdate(filter,{$set:update},{new: true}, (err, doc) => {});
        // const result = await Data.findOne({_id: req.user.id}).exec();
      }
      // console.log(req.body);
      // console.log(sl);
      // console.log(update);
      let usr=req.user.username;
      if(req.body.pagename=='query'){
            let lo=req.body.start;
            let hi=req.body.end;
            let fl={status:1,serialNumber: { $gte: lo, $lte: hi }}
            let pg='query';
            if(req.user.username!='admin_101'&&req.user.role!='admin'){  //user query
              fl={status:11,usernam1:usr,serialNumber: { $gte: lo, $lte: hi }}
              Data.find(fl,function(err,results){
                res.render('myWords',{sobdo:results,who:usr, page:pg});
              }).sort({ serialNumber: -1 });
            }
            else{  //admin query
              Data.find(fl,function(err,results){
                res.render('admin',{sobdo:results,who:usr, page:pg});
              }).sort({ serialNumber: -1 });
            }
        }

      else{ // lastTen
        if(req.user.role=='admin'||req.user.username=="admin_101"){
          res.redirect('/admin');
        }
        else{
          res.redirect('/my-words');
        }
      }



  }
  else{
    res.redirect('/admin-login');
  }

});

app.get('/get-csv',function(req,res){
			    let usr="sam74";
			  Data
			  .find({},'_id serialNumber status lock  word rootWord1 inflection1 usernam1 time1')
			  .sort({'time1': -1})
			  .limit(10)
			  .exec(function(err, results) {

         jsonData=JSON.stringify(results);
        //
        // console.log(typeof jsonData);
        const fields = ['_id', 'serialNumber', 'status', 'lock',  'word', 'rootWord1', 'inflection1', 'usernam1', 'time1'];
				const jsons2csvParser=new Parser({fields});
				const info = jsons2csvParser.parse(results);
      //  res.send(jsonData);
        res.attachment('stemmedWords.csv');
        res.status(200).send(jsons2csvParser.parse(results));
        let path="https://drive.google.com/drive/folders/1CcST75bVnnAOUkFC3M-9_Rd2R_Yy7BOE?usp=sharing";
        fs.writeFile(path+'/last10.csv',info,function(err){
        		if(err){
        			console.log(err);
        		}
        	});
			  });
        //csv file writtern
});
function getNumber(username){
	  Data.aggregate(
	  [
		{ "$match": { usernam1: {  $eq: username } } },
		{"$group" : {_id:"$usernam1", count:{$sum:1}}},
	  ]
	  ).exec((err, results) => {
		  if (err) throw err;
	  //  res.send(results[0]);
		return results[0][Object.keys(results[0])[1]];
	});
}

app.get('/stat',function(req,res){
      let u='sam74'

      Data.aggregate(
      [
        { "$match": { usernam1: {  $ne: null } } },
        // {
        //  "$group" : {
        //     _id : { $dateToString: { format: "%Y-%m-%d", date: "$time"} },
        //     totalDays: { $sum: 1 }
        //   }
        // },
        {
          //{ $dateToString: { format: "%Y-%m-%d", date: "$date" } }
          "$group" : {
                _id:"$usernam1" ,
                joined:{  $min:"$time1" },
                last:{  $max:"$time1" },
                totalDays:{$min:"9 Days"},
                totalHours:{$min:"18.6 hrs"},
                count:{$sum:{ $dateToString: { format: "%Y-%m-%d", date: "$date1" } }},
                totalWords:{$count:{}}
              },
        },
        {
              $sort : { totalWords: -1 }
        }

    //   {"$project" : {user : '$_id.username', joined : '$_id.createdOn'}}
   //  {
   //  $group : {
   //     _id : { $dateToString: { format: "%Y-%m-%d", date: "$time" } }
   //   }
   // }
      ]
      ).exec((err, results) => {
          if (err) throw err;
    //      console.log(results);
    //    res.send(results);
      res.render('stats',{st:results,timePasted:timeAgo});
      //  console.log(results[0][Object.keys(results[0])[1]]);
    //  console.log(results[0].count);
      //    console.log(results);
      });
    //  console.log(Group);
      // Group.aggregate([
      //   { "$match": { usernam: { $eq:"sam74" } } },
      // ],function(err,results){
      //   res.send(results);
      // });



  //  res.send('Insha-Allah I will show you the statistics');

});
app.post('/download',function(req,res){
			    let usr="sam74";
	        let dta=req.body.information;
        //  console.log(req.body);


          Data.aggregate(
          [
            { "$match": { usernam1: {  $ne: null } } },
            {
              //{ $dateToString: { format: "%Y-%m-%d", date: "$date" } }
              "$group" : {
                    _id:"$usernam1" ,
                    username:{$min:'$usernam1'},
                    startedFrom:{  $min:{ $dateToString: { format: "%Y-%m-%d", date: "$time1" } } },
                    lastAnnotation:{  $max:{ $dateToString: { format: "%Y-%m-%d", date: "$time1" } } },
                    totalDays:{$count:{}}, //count: { $count: { } }
                    totalHours:{$min:"_._ hrs"},
                    totalWords:{$sum:1}},
                    //totalWords:{$count:{}}
            // "$group" : {_id:"$usernam" ,started:{  $min:{ $dateToString: { format: "%Y-%m-%d", date: "$time" } } },totalDays:{$min:"_ Days"},totalHours:{$min:"_._ hrs"}, count:{$sum:1}},
            },
            {
                  $sort : { totalWords: -1 }
            }
            // {
            //  "$group" : {
            //     _id : { $dateToString: { format: "%Y-%m-%d", date: "$time"} },
            //     totalDays: { $sum: 1 }
            //   }
            // },

          ]
          ).exec((err, results) => {
              if (err) throw err;

              let jsonData= JSON.stringify(results);
            //  console.log(results);

              const fields = ['username','totalWords' ,'startedFrom', 'lastAnnotation'];
              const jsons2csvParser=new Parser({fields});
              const info = jsons2csvParser.parse(results);
            //  res.send(jsonData);
            let time=new Date();
            let date=time.getDate() + "-" + (parseInt( time.getMonth() )+parseInt('1'))+ "-" +time.getFullYear()
              let filename='userStatistics_'+date+'.csv'
              res.attachment(filename);
              res.status(200).send(jsons2csvParser.parse(results));
              let path="https://drive.google.com/drive/folders/1CcST75bVnnAOUkFC3M-9_Rd2R_Yy7BOE?usp=sharing";
              // fs.writeFile(path+'/last10.csv',info,function(err){
              // 		if(err){
              // 			console.log(err);
              // 		}
              // 	});


              //csv file writtern
          });

});
app.get('/admin-stat',function(req,res){    //joining two tables data and user
//   Data.aggregate([{
//     $lookup: {
//         from: "users", // collection name in db
//         localField: "usrnam",
//         foreignField: "username",
//         as: "createdOn"
//     }
// }]).exec(function(err, results) {
//   res.send(results);
//     // students contain WorksnapsTimeEntries
// });

});
app.post('/stat',function(req,res){
  if(req.isAuthenticated()&&req.user.status=="active"){
      let user=req.body.user;
     // var user = req.body.user.replace(/ .*/,'');
     //  console.log(user);
      Data.aggregate(
      [
        { "$match": { usernam1: {  $eq: user } } },
        {
         "$group" : {
            _id : { $dateToString: { format: "%Y-%m-%d", date: "$time1"} },
            count: { $sum: 1 },
            cnt:{ $count:{}}
          }
        },
        {
          $sort : { _id: -1 }
        }
      ]
      ).exec((err, results) => {
          if (err) throw err;

          res.render('userStats',{data:results,usr:user});
      //    console.log(results);
      });
    }
  else{
    res.redirect('/admin-login');
  }

});

app.post('/downloadFile',function(req,res){
  let user=req.body.user;
  Data.aggregate(
  [
    { "$match": { usernam1: {  $eq: user } } },
    {
     "$group" : {
        _id : { $dateToString: { format: "%Y-%m-%d", date: "$time1"} },
        date:{$min:{ $dateToString: { format: "%Y-%m-%d", date: "$time1"} }},
        wordCount: { $sum: 1 }
      }
    },
    {
      $sort : { _id: -1 }
    }
  ]
  ).exec((err, results) => {
      if (err) throw err;
      // res.render('userStats',{data:results,usr:user});
       const fields = ['date1','wordCount'];
       const jsons2csvParser_=new Parser({fields});
       const info_ = jsons2csvParser_.parse(results);
    // //  res.send(jsonData);
       let time_=new Date();
       let date_=time_.getDate() + "-" + (parseInt( time_.getMonth() )+parseInt('1'))+ "-" +time_.getFullYear()
       let filename_=user+'_perdayStatistics_'+date_+'.csv'
       res.attachment(filename_);
       res.status(200).send(jsons2csvParser_.parse(results));

  });


});




app.post('/myDay',function(req,res){
  let date=new Date(req.body.date);
  let day=date.getDate();
  let month=1+date.getMonth();
  let year=date.getFullYear();
  let user=req.body.user;

  Data.find({
    $and: [
      { usernam1:   {$eq: user } },
      { $expr: {$eq: [{$dayOfMonth: "$time1"}, day]} },
      { $expr: {$eq: [{$month: "$time1"}, month]} },
      { $expr: {$eq: [{$year: "$time1"}, year]} }
    ]
  }
  ).exec((err,results)=>{
   // res.send(results);
   res.render('admin',{sobdo:results,who:user,page:"lastTen"});
  });
});

app.post('/download-per-day',function(req,res){
  // let user=req.user.username;
  Data.aggregate(
  [
    { "$match": { usernam1: {  $ne: null } } },
    {
     "$group" : {
        _id : { $dateToString: { format: "%Y-%m-%d", date: "$time1"} },
        date:{$min:{ $dateToString: { format: "%Y-%m-%d", date: "$time1"} }},
      //  max:{ $mod: "$usernam"},
      //  weekday: {  $eq: getDay() }  ,
        count: { $sum: 1 },
      }
    },
    {
      $sort : { _id: -1 }
    }
  ]
  ).exec((err, results) => {
      if (err) throw err;
      let jsonData= JSON.stringify(results);
      //  console.log(results);

        const fields = ['date', 'count'];
        const jsons2csvParser=new Parser({fields});
        const info = jsons2csvParser.parse(results);
      //  res.send(jsonData);
      let time=new Date();
      let date=time.getDate() + "-" + (parseInt( time.getMonth() )+parseInt('1'))+ "-" +time.getFullYear()
        let filename='perDayStat_'+date+'.csv'
        res.attachment(filename);
        res.status(200).send(jsons2csvParser.parse(results));

     // res.render('perDayStat',{data:results,usr:user});
  });
});;



app.get('/faq',function(req,res){
  res.render('faq');
});
async function restoreAll(fltr,updt) {
  try{
      await  Data.updateMany(fltr, {$set:updt}, {new: true}, (err, doc) => {});
        return doc.save();
  }
  catch(error){

  }
}
app.post('/restoreAll',function(req,res){
  const fltr={status : 2};   //from skipped
  const updt ={ status : 0};  // making incomplete
  restoreAll(fltr,updt);
  res.redirect('/skipped-words')
});

app.get("/rootFinder",function(req,res){
  res.render('rootFinder',words=[],sentence="",ln=0)
})
app.post("/rootFinder",function(req, res){
  sentence=req.body.bakko;
//   let words=spawn("python3",["./python_files/token.py",sentence]);
//   var roots = spawn("python3",["./python_files/prediction.py",words]);
//   roots.stdout.on("data",function(data){
//       res.send(data.toString());
// });
   // let argument = "True";
    const pythonProcess = spawn('python3', ['-c', 
    `import token; token.tokenize(${sentence});`]);
    pythonProcess.stdout.on('data', (data) => {
        res.send(`stdout: ${data}`);
    });
    pythonProcess.stderr.on('data', (data) => {
        console.log(`stderr: ${data}`);
    });
    pythonProcess.on('exit', (code) => {
        console.log(`Python process ended with code: ${code}`);
    });
});

app.listen(process.env.PORT||3000,function(err){

    // Data.updateMany({usernam: 'Ismahabul Hasan'}, {$set:{usernam: 'Ismahabul_Hasan'}}, {new: true}, (err, doc) => {});
       

  // Data.find({},function(err,results){
  //   for(let i=0; i<500; i++){
  //       console.log(results[i].serialNumber);
  //   }

  // });
  console.log('Alhamdulillah Server Started at '+new Date());
});
