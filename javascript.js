document.addEventListener("DOMContentLoaded", () => {
  const fixedThemeToggle = document.getElementById("fixed-theme-toggle")
  const themeToggleIcon = document.getElementById("theme-toggle-icon")
  const contentArea = document.getElementById("content-area")
  const problemNavigation = document.getElementById("problem-navigation")
  const connectionNavigation = document.getElementById("connection-navigation")
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle")
  const sidebar = document.querySelector(".sidebar");
  const loadingScreen = document.getElementById("loading-screen")

  let sidebarNavigations = null;
  let navLinks = [];

  if (sidebar) {
    sidebarNavigations = sidebar.querySelectorAll("nav");
    if (sidebarNavigations && sidebarNavigations.length > 0) {
      sidebarNavigations.forEach((nav) => {
        navLinks = navLinks.concat(Array.from(nav.querySelectorAll("a")));
      });
    }
  }

  const searchInput = document.getElementById("search-input")
  const searchResults = document.getElementById("search-results")
  const searchNotFound = document.getElementById("search-not-found")
  let searchDatabaseLoadingEl = document.getElementById("search-database-loading");

  let problemsData = [];
  let isDatabaseLoading = false;
  let databaseFullyLoaded = false;
  let dataFilesToLoad = [];
  let loadedDataFileCount = 0;

  if (!searchDatabaseLoadingEl && searchInput) {
    searchDatabaseLoadingEl = document.createElement('div');
    searchDatabaseLoadingEl.id = 'search-database-loading';
    searchDatabaseLoadingEl.className = 'search-database-loading';
    searchDatabaseLoadingEl.style.display = 'none';
    searchDatabaseLoadingEl.innerHTML = '<span><i class="loading-icon">🔄</i> 数据库加载中...</span> <button id="reload-database-button">重试加载</button>';
    if (searchResults) {
      searchResults.parentNode.insertBefore(searchDatabaseLoadingEl, searchResults);
    } else {
      searchInput.parentNode.insertBefore(searchDatabaseLoadingEl, searchInput.nextSibling);
    }
    const reloadButton = searchDatabaseLoadingEl.querySelector('#reload-database-button');
    if (reloadButton) {
      reloadButton.addEventListener('click', () => {
        if (!isDatabaseLoading) {
          loadDatabaseIndex();
        }
      });
    }
  }


  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`);
    }
    return response.json();
  }

  async function loadAllDataFiles() {
    if (dataFilesToLoad.length === 0) {
      console.log("没有数据文件需要加载。");
      databaseFullyLoaded = true;
      isDatabaseLoading = false;
      if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = 'none';
      if (searchInput && searchInput.value.trim() !== "") {
        updateSearchResults(searchInput.value.toLowerCase().trim());
      }
      return;
    }

    isDatabaseLoading = true;
    if (searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = 'block';
      searchDatabaseLoadingEl.querySelector('span').innerHTML = `<span><i class="loading-icon">🔄</i> 数据库加载中 (${loadedDataFileCount}/${dataFilesToLoad.length})...</span>`;
    }

    const promises = dataFilesToLoad.map(fileInfo =>
      fetchJson(fileInfo.path)
        .then(dataChunk => {
          if (dataChunk.problems && Array.isArray(dataChunk.problems)) {
            problemsData = problemsData.concat(dataChunk.problems);
          }
          loadedDataFileCount++;
          if (searchDatabaseLoadingEl) {
            searchDatabaseLoadingEl.querySelector('span').innerHTML = `<span><i class="loading-icon">🔄</i> 数据库加载中 (${loadedDataFileCount}/${dataFilesToLoad.length})...</span>`;
          }
          if (searchInput && searchInput.value.trim() !== "") {
            updateSearchResults(searchInput.value.toLowerCase().trim());
          }
        })
        .catch(error => {
          console.error(`加载数据文件 ${fileInfo.path} 失败:`, error);
        })
    );

    try {
      await Promise.all(promises);
      databaseFullyLoaded = true;
      console.log("所有数据库文件加载完成。总条目:", problemsData.length);
    } catch (error) {
      console.error("加载部分数据库文件时出错:", error);
    } finally {
      isDatabaseLoading = false;
      if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = 'none';
      if (searchInput && searchInput.value.trim() !== "") {
        updateSearchResults(searchInput.value.toLowerCase().trim());
      }
    }
  }

  async function loadDatabaseIndex() {
    if (isDatabaseLoading && !databaseFullyLoaded) {
      console.log("数据库已在加载中...");
      return;
    }
    if (databaseFullyLoaded) {
      console.log("数据库已完全加载。");
      if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = 'none';
      return;
    }

    isDatabaseLoading = true;
    databaseFullyLoaded = false;
    problemsData = [];
    loadedDataFileCount = 0;
    dataFilesToLoad = [];

    if (searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = 'block';
      searchDatabaseLoadingEl.querySelector('span').innerHTML = '<span><i class="loading-icon">🔄</i> 正在加载数据库索引...</span>';
    }

    try {
      const indexData = await fetchJson('database/index.json');
      if (indexData && indexData.files && Array.isArray(indexData.files)) {
        dataFilesToLoad = indexData.files;
        if (dataFilesToLoad.length > 0) {
          await loadAllDataFiles();
        } else {
          console.log("索引文件中没有数据文件列表。");
          databaseFullyLoaded = true;
          isDatabaseLoading = false;
          if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = 'none';
        }
      } else {
        throw new Error("数据库索引文件格式不正确。");
      }
    } catch (error) {
      console.error("加载数据库索引失败:", error);
      isDatabaseLoading = false;
      if (searchDatabaseLoadingEl) {
        searchDatabaseLoadingEl.querySelector('span').textContent = '数据库加载失败!';
      }
    }
  }

  loadDatabaseIndex();

  const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)")

  function applyTheme(theme) {
    if (theme === "dark") {
      document.body.classList.add("dark-mode")
      localStorage.setItem("theme", "dark")
      if (themeToggleIcon) themeToggleIcon.src = "images/redstone_torch.png"
    } else {
      document.body.classList.remove("dark-mode")
      localStorage.setItem("theme", "light")
      if (themeToggleIcon) themeToggleIcon.src = "images/torch.png"
    }
  }

  const savedTheme = localStorage.getItem("theme")
  if (savedTheme) {
    applyTheme(savedTheme)
  } else if (prefersDarkScheme.matches) {
    applyTheme("dark")
  } else {
    applyTheme("light")
  }

  if (fixedThemeToggle) {
    fixedThemeToggle.addEventListener("click", () => {
      if (document.body.classList.contains("dark-mode")) {
        applyTheme("light")
      } else {
        applyTheme("dark")
      }
    })
  }

  prefersDarkScheme.addEventListener("change", (e) => {
    if (!localStorage.getItem("theme")) {
      applyTheme(e.matches ? "dark" : "light")
    }
  })

  if (mobileMenuToggle) {
    mobileMenuToggle.addEventListener("click", () => {
      mobileMenuToggle.classList.toggle("active")
      sidebar.classList.toggle("active")
    })
  }

  async function loadPage(pageUrl, linkElement) {
    try {
      navLinks.forEach((link) => link.classList.remove("active"))
      if (searchResults) {
        const searchResultLinks = searchResults.querySelectorAll("a")
        searchResultLinks.forEach((link) => link.classList.remove("active"))
      }

      if (linkElement) {
        linkElement.classList.add("active")
      }

      contentArea.innerHTML =
        '<div class="loading-animation"><img src="images/grass_block.png" alt="加载中" class="loading-block"><p>加载中...</p></div>'

      const response = await fetch(pageUrl)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status} for ${pageUrl}`)
      }

      const pageContent = await response.text()

      while (contentArea.firstChild) {
        contentArea.removeChild(contentArea.firstChild)
      }

      const parser = new DOMParser()
      const doc = parser.parseFromString(pageContent, "text/html")

      const fragment = document.createDocumentFragment()
      Array.from(doc.body.childNodes).forEach((node) => {
        fragment.appendChild(node.cloneNode(true))
      })

      contentArea.classList.remove("loaded-content")
      void contentArea.offsetWidth

      contentArea.appendChild(fragment)
      contentArea.classList.add("loaded-content")

      if (searchResults) {
        searchResults.style.display = "none"
      }

      if (sidebar.classList.contains("active") && window.innerWidth <= 768) {
        sidebar.classList.remove("active")
        mobileMenuToggle.classList.remove("active")
      }
    } catch (error) {
      let errorMessage = `
                  <div class="error-container">
                      <h2>加载失败,您是否在自己尝试本地直接访问而不是url?</h2>
                      <h2>如果您是从我们官方网站访问出现请及时issue反馈我们,很抱歉给您造成麻烦!</h2>
                      <p>抱歉，加载页面失败：${pageUrl}</p>
                      <p>错误详情: ${error.message}</p>
                  `
      if (
        error.message.includes("Failed to fetch") ||
        (error.name === "TypeError" && window.location.protocol === "file:")
      ) {
        errorMessage += `
                  <div class="error-tip">
                      <p><strong>提示：</strong>如果您是直接在本地打开 HTML 文件 (使用 <code>file:///</code> 协议)，浏览器可能会因为安全策略 (CORS) 阻止页面内容的加载。
                      请尝试使用一个简单的本地 HTTP 服务器来访问这些文件。例如，在项目根目录下运行以下命令之一：</p>
                      <ul>
                          <li>如果您安装了 Node.js: <code>npx serve .</code></li>
                          <li>如果您安装了 Python: <code>python -m http.server</code> (Python 3) 或 <code>python -m SimpleHTTPServer</code> (Python 2)</li>
                      </ul>
                      <p>然后在浏览器中访问类似 <code>http://localhost:8000</code> (具体端口号看终端输出) 的地址。</p>
                  </div>`
      }
      errorMessage += `</div>`
      contentArea.innerHTML = errorMessage
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault()
      const page = link.dataset.page
      if (page) {
        loadPage(page, link)
        if (searchInput) searchInput.value = ""
        if (searchNotFound) searchNotFound.style.display = "none"
        if (searchResults) searchResults.style.display = "none"
      }
    })
  })

  if (searchInput) {
    searchInput.addEventListener("input", (event) => {
      const searchTerm = event.target.value.toLowerCase().trim()
      filterSidebar(searchTerm)
      updateSearchResults(searchTerm)
    })

    document.addEventListener("click", (event) => {
      if (!searchInput.contains(event.target) && !searchResults.contains(event.target)) {
        searchResults.style.display = "none"
      }
    })

    searchInput.addEventListener("focus", () => {
      const searchTerm = searchInput.value.toLowerCase().trim()
      if (searchTerm) {
        updateSearchResults(searchTerm)
      }
    })
  }

  function filterSidebar(searchTerm) {
    const navigationItems = problemNavigation.querySelectorAll("ul li")
    let foundInProblemNav = 0

    navigationItems.forEach((item) => {
      const link = item.querySelector("a")
      if (link) {
        const linkText = link.textContent.toLowerCase()
        if (linkText.includes(searchTerm)) {
          item.style.display = ""
          foundInProblemNav++
        } else {
          item.style.display = "none"
        }
      }
    })
  }

  function updateSearchResults(searchTerm) {
    searchResults.innerHTML = ""

    if (!searchTerm) {
      searchResults.style.display = "none"
      searchNotFound.style.display = "none";
      if (searchDatabaseLoadingEl && !databaseFullyLoaded) {
        searchDatabaseLoadingEl.style.display = 'block';
      } else if (searchDatabaseLoadingEl) {
        searchDatabaseLoadingEl.style.display = 'none';
      }
      return;
    }

    // 如果数据库仍在加载，显示提示，但仍然执行搜索
    if (isDatabaseLoading && !databaseFullyLoaded && searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = 'block';
    } else if (searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = 'none';
    }

    const currentProblemsToSearch = problemsData.length > 0 ? problemsData : []; // 使用已加载的数据

    const matchedProblems = currentProblemsToSearch.filter(
      (problem) => {
        const titleMatch = problem && typeof problem.title === 'string' && problem.title.toLowerCase().includes(searchTerm);
        const summaryMatch = problem && typeof problem.summary === 'string' && problem.summary.toLowerCase().includes(searchTerm);
        return titleMatch || summaryMatch;
      }
    );

    if (matchedProblems.length > 0) {
      matchedProblems.forEach((problem) => {
        const resultItem = document.createElement("a")
        resultItem.href = "#"
        resultItem.textContent = problem.title
        resultItem.dataset.url = problem.url
        resultItem.title = problem.title

        resultItem.addEventListener("click", (event) => {
          event.preventDefault()
          loadPage(problem.url, resultItem)
          searchResults.style.display = "none"
          searchNotFound.style.display = "none"
        })
        searchResults.appendChild(resultItem)
      })
      searchResults.style.display = "block"
      searchNotFound.style.display = "none"
    } else {
      searchResults.style.display = "none"
      if (searchTerm) {
        if (!databaseFullyLoaded && problemsData.length > 0) {
          searchNotFound.innerHTML = `<p>正在搜索已加载的 ${problemsData.length} 条数据... 更多数据仍在后台加载中。</p>`;
        } else if (!databaseFullyLoaded && problemsData.length === 0) {
          searchNotFound.innerHTML = `<p>数据库仍在加载中，请稍候或尝试刷新...</p>`;
        }
        else {
          // 这里为了代码标准通过没有实际代码
        }
        searchNotFound.style.display = "block";
      } else {
        searchNotFound.style.display = "none";
      }
    }
  }

  window.addEventListener("resize", () => {
    if (window.innerWidth > 768 && sidebar.classList.contains("active")) {
      sidebar.classList.remove("active")
      mobileMenuToggle.classList.remove("active")
    }
  })

  setTimeout(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = "0"
      setTimeout(() => {
        loadingScreen.style.display = "none"
      }, 500)
    }
  }, 1500)

  navLinks.forEach((link) => {
    link.title = link.textContent
  })
})
