const port = 4000;

const express = require("express");
const app = express();
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const multer = require("multer");
const path = require("path");
const cors = require("cors");

app.use(express.json());
app.use(cors());

//Database connection with mongodb
mongoose.connect("mongodb://127.0.0.1:27017/database");

//Api creation
app.get("/", (req, res) => {
	res.send("App is running");
});

const storage = multer.diskStorage({
	destination: "./upload/images",
	filename: (req, file, cb) => {
		return cb(null, `${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`);
	},
});
const upload = multer({ storage: storage });

//Create upload endpoint for images
app.use("/images", express.static("upload/images"));

app.post("/upload", upload.single("product"), (req, res) => {
	res.json({
		success: 1,
		image_url: `http://localhost:${port}/images/${req.file.filename}`,
	});
});

//Create Schema for User model
const User = mongoose.model("User", {
	name: { type: String, required: true },
	email: { type: String, unique: true },
	password: { type: String },
	cartData: { type: Object },
	date: { type: Date, default: Date.now() },
});

//Create Endpoint for registering the user

app.post("/signup", async (req, res) => {
	let check = await User.findOne({ email: req.body.email });
	if (check) {
		return res.status(404).json({
			success: false,
			error: "Existing user found!!!",
		});
	}
	let cart = {};
	for (let i = 0; i < 300; i++) {
		cart[i] = 0;
	}
	const user = new User({
		name: req.body.username,
		email: req.body.email,
		password: req.body.password,
		cartData: cart,
	});
	await user.save();
	const data = {
		user: {
			id: user.id,
		},
	};
	const token = jwt.sign(data, "secret_ecom");
	res.json({
		success: 1,
		token,
	});
});

//Create Endpoint for User login
app.post("/login", async (req, res) => {
	let user = await User.findOne({ email: req.body.email });
	if (user) {
		const passCompare = req.body.password === user.password;
		if (passCompare) {
			const data = {
				user: {
					id: user.id,
				},
			};
			const token = jwt.sign(data, "secret_ecom");
			res.json({
				success: 1,
				token,
			});
		} else {
			res.json({
				success: false,
				error: "Wrong password",
			});
		}
	} else {
		res.json({
			success: false,
			error: "Wrong email",
		});
	}
});
//Create middleware for fetch user
const fetchUser = async (req, res, next) => {
	const token = req.header("auth-token");
	if (!token) {
		res.status(401).send({
			error: "Please authenticate using a valid token.",
		});
	} else {
		try {
			const data = jwt.verify(token, "secret_ecom");
			req.user = data.user;
			next();
		} catch (error) {
			res.status(401).send({
				error: "Please authenticate using a valid token.",
			});
		}
	}
};

//Create endpoint for adding product to cart
app.post("/addtocart", fetchUser, async (req, res) => {
	console.log("Add", req.body.itemId);
	let userData = await User.findOne({ _id: req.user.id });
	if (userData) {
		userData.cartData[req.body.itemId] += 1;
	}
	await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
	res.send("Added");
});
//Create endpoint for removing product from cart
app.post("/removefromcart", fetchUser, async (req, res) => {
	console.log("Remove", req.body.itemId);
	let userData = await User.findOne({ _id: req.user.id });
	if (userData) {
		if (userData.cartData[req.body.itemId] > 0) userData.cartData[req.body.itemId] -= 1;
	}
	await User.findOneAndUpdate({ _id: req.user.id }, { cartData: userData.cartData });
	res.send("Removed");
});

//Create endpoint to get cart data

app.post("/getcart", fetchUser, async (req, res) => {
	console.log("Get cart");
	let userData = await User.findOne({ _id: req.user.id });
	res.json(userData.cartData);
});

//Schema for Creating products

const Product = mongoose.model("Product", {
	id: { type: Number, required: true },
	name: { type: String, required: true },
	image: { type: String, required: true },
	category: { type: String, required: true },
	new_price: { type: Number, required: true },
	old_price: { type: Number, required: true },
	date: { type: Date, default: Date.now() },
	available: { type: Boolean, default: true },
});

//Create API for adding new product
app.post("/addproduct", async (req, res) => {
	let products = await Product.find({});
	let id;
	if (products.length > 0) {
		let last_product_array = products.slice(-1);
		let last_product = last_product_array[0];
		id = last_product.id + 1;
	} else {
		id = 1;
	}
	const product = new Product({
		id: id,
		name: req.body.name,
		image: req.body.image,
		category: req.body.category,
		new_price: req.body.new_price,
		old_price: req.body.old_price,
	});
	console.log(product);
	await product.save();
	res.json({
		success: 1,
		name: req.body.name,
	});
});

//Create API for deleting product

app.post("/removeproduct", async (req, res) => {
	await Product.findOneAndDelete({ id: req.body.id });
	console.log("Removed");
	res.json({
		success: 1,
		name: req.body.name,
	});
});

//Create API for getting all products

app.get("/allproducts", async (req, res) => {
	let products = await Product.find({});
	console.log("All products fetched");
	res.send(products);
});

//Create API for getting NewCollection data
app.get("/newcollection", async (req, res) => {
	let products = await Product.find({});
	let newCollection = products.slice(1).slice(-8);
	console.log("NewCollection Fetched!!");
	res.send(newCollection);
});
//Create API for getting Popular in women section
app.get("/popularinwomen", async (req, res) => {
	let products = await Product.find({ category: "Women" });
	let popular_in_women = products.slice(0, 4);
	console.log("Popular in women Fetched!!");
	res.send(popular_in_women);
});

app.listen(port, error => {
	if (!error) {
		console.log(`App listening on port ${port}`);
	} else {
		console.log("Error: " + error);
	}
});
