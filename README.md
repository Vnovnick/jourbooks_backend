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

`/book/shelved/:user_book_id` - GET - returns a specific book that was shelved by the user

### Journal Entry Endpoints (Belonging to a specific book)

`book/shelved/journal/:book_id` - POST - saves a journal entry post under a book the user has shelved

`book/shelved/journal/:book_user_ids` - GET - retrieves all journal entries corresponding to a book the user has saved

`book/shelved/journal/all/:user_id` - GET - retrieves all journal entries belonging to the specified user

`book/shelved/journal/:book_user_post_ids` - DELETE - deletes journal entry from the database and detaches it from the user

`book/shelved/journal/:post_id` - PATCH - updates journal entry and adds an `edited_at` value to be displayed along with the `created_at` value in the frontend

### Review Endpoints (Belonging to a specific book)

_Note: a review is retrieved in the `book/shelved/:user_book_id` endpoint together with the rest of the book info. A request for all a given user's reviews will be added at a later time._

`book/shelved/review/:book_id` - POST - saves a review under a book the user has shelved

`book/shelved/review/:review_id` - PATCH - updates review and attaches an `edited_at` value that gets displayed along with the `created_at` value in the frontend

`book/shelved/review/:book_user_review_ids` - DELETE - deleted review and detaches it from the user
