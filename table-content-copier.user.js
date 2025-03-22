// ==UserScript==
// @name         테이블 내용 복사기
// @namespace    https://github.com/wprnrqnf/table-content-copier
// @version      1.1
// @description  테이블 내용을 복사 아이콘을 통해 복사하는 스크립트
// @author       Cuckoo Hunter
// @match        https://arca.live/b/characterai*
// @grant        GM_setClipboard
// @grant        GM_addStyle
// @downloadURL  https://raw.githubusercontent.com/wprnrqnf/table-content-copier/refs/heads/main/table-content-copier.user.js
// @updateURL    https://raw.githubusercontent.com/wprnrqnf/table-content-copier/refs/heads/main/table-content-copier.user.js
// ==/UserScript==

(function() {
    'use strict';


    GM_addStyle(`
        .copy-icon-container {
            position: absolute;
            right: 5px;
            top: 5px;
            z-index: 9999;
            opacity: 0;
            transition: opacity 0.2s ease-in-out;
            pointer-events: none;
        }

        .copy-icon {
            width: 28px;
            height: 28px;
            background-color: rgba(100, 100, 255, 0.9);
            border-radius: 5px;
            cursor: pointer;
            text-align: center;
            line-height: 28px;
            font-size: 16px;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
            color: white;
            pointer-events: auto;
        }

        .copy-icon:hover {
            background-color: rgba(80, 80, 255, 1);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        }

        td {
            position: relative;
        }

        td:hover .copy-icon-container,
        .copy-icon-container:hover,
        .copy-icon-container.active {
            opacity: 1;
            pointer-events: auto;
        }

        /* 복사 성공 알림 스타일 */
        .copy-notification {
            position: fixed;
            background-color: #4CAF50;
            color: white;
            padding: 8px 16px;
            border-radius: 4px;
            z-index: 10000;
            font-size: 14px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.2);
            animation: fadeIn 0.3s, fadeOut 0.3s 1.7s;
        }

        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes fadeOut {
            from { opacity: 1; }
            to { opacity: 0; }
        }
    `);


    const hideTimers = new WeakMap();


    function extractTextWithLineBreaks(element) {

        const tempElement = element.cloneNode(true);


        const copyIconContainers = tempElement.querySelectorAll('.copy-icon-container');
        copyIconContainers.forEach(container => container.remove());


        const emojiImages = tempElement.querySelectorAll('img.twemoji, img[alt*="💖"], img[alt*="🎁"], img[alt*="🎀"], img[alt*="😊"], img[data-emoji], img.emoji');
        emojiImages.forEach(img => {
            if (img.alt && img.alt.trim()) {
                img.replaceWith(document.createTextNode(img.alt));
            }
        });


        const emojiElements = tempElement.querySelectorAll('.emoji, [data-emoji], .emoticon');
        emojiElements.forEach(elem => {

            const emojiText = elem.getAttribute('alt') || elem.getAttribute('data-emoji') || elem.textContent;
            if (emojiText) {
                elem.replaceWith(document.createTextNode(emojiText));
            }
        });


        const brElements = tempElement.querySelectorAll('br');
        brElements.forEach(br => br.replaceWith(document.createTextNode('\n')));


        const blockElements = tempElement.querySelectorAll('p, div, h1, h2, h3, h4, h5, h6, li');
        blockElements.forEach(el => {
            if (el.nextSibling) {
                el.insertAdjacentText('afterend', '\n');
            }
        });


        let text = tempElement.textContent || tempElement.innerText || '';


        text = text.replace(/[ \t]+/g, ' ');


        text = text.replace(/\n{3,}/g, '\n\n');


        text = text.trim();

        return text;
    }


    function createCopyIcon(element) {

        const container = document.createElement('div');
        container.className = 'copy-icon-container';


        const icon = document.createElement('div');
        icon.className = 'copy-icon';
        icon.innerHTML = '📋';
        icon.title = '내용 복사하기';

        container.appendChild(icon);


        icon.addEventListener('click', function(e) {
            e.stopPropagation();


            const textToCopy = extractTextWithLineBreaks(element);


            console.log('복사된 텍스트:', textToCopy);


            GM_setClipboard(textToCopy);


            const notification = document.createElement('div');
            notification.textContent = '복사되었습니다!';
            notification.className = 'copy-notification';
            notification.style.left = (e.clientX - 50) + 'px';
            notification.style.top = (e.clientY - 40) + 'px';
            document.body.appendChild(notification);


            setTimeout(() => {
                document.body.removeChild(notification);
            }, 2000);
        });

        return container;
    }


    function isInputField(element) {

        if (element.isContentEditable || element.querySelector('[contenteditable="true"]')) {
            return true;
        }


        const inputs = ['textarea', 'input', 'select'];
        for (let inputType of inputs) {
            if (element.closest(inputType)) {
                return true;
            }
        }


        const editorPatterns = ['editor', 'wysiwyg', 'text-area', 'richtext', 'compose'];
        const attributes = Array.from(element.attributes).map(attr => attr.name + '=' + attr.value);
        const classNames = element.className.split(' ');


        for (let pattern of editorPatterns) {
            if (
                element.id.toLowerCase().includes(pattern) ||
                classNames.some(cls => cls.toLowerCase().includes(pattern)) ||
                attributes.some(attr => attr.toLowerCase().includes(pattern))
            ) {
                return true;
            }
        }

        return false;
    }


    function addCopyIcons() {
        const tableCells = document.querySelectorAll('table td');

        tableCells.forEach(cell => {

            if (isInputField(cell)) {
                return;
            }


            if (!cell.querySelector('.copy-icon-container')) {
                const cellText = cell.textContent.trim();
                if (cellText) {
                    const copyIcon = createCopyIcon(cell);
                    cell.appendChild(copyIcon);


                    cell.addEventListener('mouseenter', function() {
                        const iconContainer = this.querySelector('.copy-icon-container');
                        if (iconContainer) {
                            iconContainer.classList.add('active');


                            if (hideTimers.has(iconContainer)) {
                                clearTimeout(hideTimers.get(iconContainer));
                            }
                        }
                    });


                    cell.addEventListener('mouseleave', function() {
                        const iconContainer = this.querySelector('.copy-icon-container');
                        if (iconContainer) {

                            const timerId = setTimeout(() => {
                                iconContainer.classList.remove('active');
                                hideTimers.delete(iconContainer);
                            }, 3000);

                            hideTimers.set(iconContainer, timerId);
                        }
                    });


                    copyIcon.addEventListener('mouseenter', function() {
                        if (hideTimers.has(this)) {
                            clearTimeout(hideTimers.get(this));
                        }
                    });


                    copyIcon.addEventListener('mouseleave', function() {
                        const timerId = setTimeout(() => {
                            this.classList.remove('active');
                            hideTimers.delete(this);
                        }, 3000);

                        hideTimers.set(this, timerId);
                    });
                }
            }
        });
    }


    window.addEventListener('load', addCopyIcons);


    const observer = new MutationObserver(function(mutations) {
        setTimeout(addCopyIcons, 500);
    });

    observer.observe(document.body, { childList: true, subtree: true });
})();
