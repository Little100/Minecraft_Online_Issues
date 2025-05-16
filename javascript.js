document.addEventListener("DOMContentLoaded", () => {
    const fixedThemeToggle = document.getElementById("fixed-theme-toggle")
    const themeToggleIcon = document.getElementById("theme-toggle-icon")
    const contentArea = document.getElementById("content-area")
    const problemNavigation = document.getElementById("problem-navigation")
    const connectionNavigation = document.getElementById("connection-navigation")
    // const sidebarNavigations = document.querySelectorAll(".sidebar nav") // 旧的直接获取
    const mobileMenuToggle = document.getElementById("mobile-menu-toggle")
    const sidebar = document.querySelector(".sidebar") // 先获取 .sidebar
    const loadingScreen = document.getElementById("loading-screen")

    let sidebarNavigations = null;
    let navLinks = [];

    if (sidebar) { // 确保 .sidebar 存在
        sidebarNavigations = sidebar.querySelectorAll("nav"); // 然后在其内部查找 nav
        if (sidebarNavigations && sidebarNavigations.length > 0) {
            sidebarNavigations.forEach((nav) => {
                navLinks = navLinks.concat(Array.from(nav.querySelectorAll("a")));
            });
        } else {
            console.warn("No <nav> elements found within .sidebar.");
        }
    } else {
        console.error(".sidebar element not found in the DOM at script execution time.");
    }
  
    const searchInput = document.getElementById("search-input")
    const searchResults = document.getElementById("search-results")
    const searchNotFound = document.getElementById("search-not-found")
  
    const problemsDatabase = [
      {
        id: "online1",
        title: "FRP[内网穿透]",
        summary:
          "使用内网穿透连接到服务器,FRP,内网穿透,联机",
        url: "subpages/frp.html",
      },
      {
        id: "online2",
        title: "p2p",
        summary:
          'p2p,点对点,联机',
        url: "subpages/p2p.html",
      },
      {
        id: "online3",
        title: "ipv6",
        summary: 
          "ipv6,联机",
        url: "subpages/ipv6.html",
      },
      {
        id: "problem1",
        title: "身份验证失败",
        summary: 
          "身份验证失败,重启客户端",
        url: "subpages/authfailed.html",
      }
    ]
  
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
        searchNotFound.style.display = "none"
        return
      }
  
      const matchedProblems = problemsDatabase.filter(
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
          resultItem.title = problem.title // 添加 title 属性用于悬停显示完整文本
  
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
          searchNotFound.style.display = "block"
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
  
