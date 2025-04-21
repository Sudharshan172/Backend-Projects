const express = require("express");
const app = express();

const { open } = require("sqlite");
const path = require("path");
const sqlite3 = require("sqlite3");

app.use(express.json());
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "goodreads.db");
let db = null;
const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//Register User API Call
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `insert into user(username,name,password,gender,location)
    values('${username}','${name}','${hashedPassword}','${gender}','${location}');`;
    await db.run(createUserQuery);
    response.send("User Created Successfully");
  } else {
    response.status(400);
    response.send("User already exist");
  }
});

//Login user API Call
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `select * from user where username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "somerandomtoken");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid Password");
    }
  }
});

// Generate Authentication Token
const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid Access Token");
  } else {
    jwt.verify(jwtToken, "somerandomtoken", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid Access Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

//GET Profile API Call
app.get("/profile/", authenticateToken, async (request, response) => {
  let { username } = request;
  console.log(username);
  const selectUserQuery = `select *from user where username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);
  response.send(dbUser);
});

//GET BOOKS API Call
app.get("/books/", authenticateToken, async (request, response) => {
  const getBooksQuery = `select * from book order by book_id;`;
  const bookArray = await db.all(getBooksQuery);
  response.send(bookArray);
});

//GET BOOK API Call
app.get("/books/:bookId/", authenticateToken, async (request, response) => {
  const { bookId } = request.params;
  const getBookQuery = `select * from book where book_id=${bookId};`;
  const book = await db.get(getBookQuery);
  response.send(book);
});

//ADD BOOK API Call
app.post("/books/", authenticateToken, async (request, response) => {
  const bookDetails = request.body;
  const {
    title,
    author_id,
    rating,
    rating_count,
    review_count,
    description,
    pages,
    date_of_publication,
    edition_language,
    price,
    online_stores,
  } = bookDetails;
  const addBookQuery = `insert into book(title,author_id,rating,rating_count,review_count,description,pages,date_of_publication,edition_language,price,online_stores)
  values
  ('${title}',
    ${author_id},
    ${rating},
    ${rating_count},
    ${review_count},
    '${description}',
    ${pages},
    '${date_of_publication}',
    '${edition_language}',
    ${price},
    '${online_stores}');`;

  const dbResponse = await db.run(addBookQuery);
  const bookId = dbResponse.lastID;
  response.send({ bookId: bookId });
});

//UPDATE BOOK API Call
app.put("/books/:bookId/", authenticateToken, async (request, response) => {
  const { bookId } = request.params;
  const bookDetails = request.body;
  const {
    title,
    author_id,
    rating,
    rating_count,
    review_count,
    description,
    pages,
    date_of_publication,
    edition_language,
    price,
    online_stores,
  } = bookDetails;
  const updateBookQuery = `update book set
    title = '${title}',
    author_id = ${author_id},
    rating = ${rating},
    rating_count = ${rating_count},
    review_count = ${review_count},
    description = '${description}',
    pages = ${pages},
    date_of_publication = '${date_of_publication}',
    edition_language = '${edition_language}',
    price = ${price},
    online_stores = '${online_stores}' where book_id = ${bookId};`;
  await db.run(updateBookQuery);
  response.send("Book updated successfully");
});

//DELETE BOOK API Call
app.delete("/books/:bookId/", authenticateToken, async (request, response) => {
  const { bookId } = request.params;
  const deleteBookQuery = `delete from book where book_id=${bookId};`;
  await db.run(deleteBookQuery);
  response.send("Book Deleted Successfully");
});

//GET Author Books API Call
app.get("/authors/:authorId/books/", authenticateToken, async (request, response) => {
    const { authorId } = request.params;
    const getAuthorBooksQuery = `select *from book where author_id=${authorId};`;
    const booksArray = await db.all(getAuthorBooksQuery);
    response.send(booksArray);
  }
);



