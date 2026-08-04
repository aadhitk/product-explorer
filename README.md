# Object Index

A responsive product explorer built for the GDG Web Development Frontend Track. It loads live product data from DummyJSON, supports debounced API search, and paginates using the API's `limit` and `skip` parameters.

**Live:** [https://aadhitk.github.io/product-explorer/](https://aadhitk.github.io/product-explorer/)

## Run locally

Use any static server from this directory. For example:

```bash
npx serve .
```

Then open the address printed by the server.

## What's included

- Product cards show title, price, thumbnail, and rating.
- Search calls `/products/search` after a 300 ms debounce.
- Pagination requests only the active API page and handles first, last, partial, and empty-result pages.
- Loading skeletons, request cancellation, image fallback, and a recoverable error message with retry.
- Responsive layout down to 320 px.

## Test

```bash
npm test
```

## Known gaps

None at the moment. The app needs an internet connection because it uses DummyJSON directly, as required.
