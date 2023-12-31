# Welcome to JourBooks

This is the repo for the Express.js API that sends all of its queries to a local PostgreSQL database on my local machine. Following this [link](https://github.com/Vnovnick/jourbooks) will take you to the Frontend of Joubooks which is built using SvelteKit.

## Existing Endpoints

### User endpoints

`/user/:id` - GET - returns a user info object that matches the id parameter passed into the endpoint

`/login` - POST - login request that validates the user's email and password for a match in the database

`/register` - POST - request to register a new user and create a new JourBooks account

### Book endpoints

`/book/shelve/:user_id` - POST - allows the user to save a book to a shelve of their choosing (shelve options so far: Currently Reading, Read, Want to Read)

`/book/shelved/all/:user_id` - GET - returns all of a user's shelved (saved) books

`/book/shelved/:book_id` - GET - returns a specific book that was shelved by the user
