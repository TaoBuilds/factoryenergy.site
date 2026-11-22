'use strict';

const articleToc = document.querySelector('[data-article-toc]');

if (articleToc) {
  const narrow = window.matchMedia('(max-width: 52rem)');

  articleToc.open = !narrow.matches;

  articleToc.addEventListener('click', event => {
    if (narrow.matches && event.target instanceof Element && event.target.closest('a[href^="#"]')) {
      articleToc.open = false;
    }
  });
}
