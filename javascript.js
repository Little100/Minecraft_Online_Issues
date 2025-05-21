document.addEventListener("DOMContentLoaded", () => {
  const fixedThemeToggle = document.getElementById("fixed-theme-toggle")
  const themeToggleIcon = document.getElementById("theme-toggle-icon")
  const contentArea = document.getElementById("content-area")
  const problemNavigation = document.getElementById("problem-navigation")
  const connectionNavigation = document.getElementById("connection-navigation")
  const mobileMenuToggle = document.getElementById("mobile-menu-toggle")
  const sidebar = document.querySelector(".sidebar")
  const loadingScreen = document.getElementById("loading-screen")

  let navLinks = []

  const staticProblemIdsToExclude = ["online1", "online2", "online3", "online4", "online5","caidan"]

  const searchInput = document.getElementById("search-input")
  const searchResults = document.getElementById("search-results")
  const searchNotFound = document.getElementById("search-not-found")
  let searchDatabaseLoadingEl = document.getElementById("search-database-loading")

  let problemsData = []
  let isDatabaseLoading = false
  let databaseFullyLoaded = false
  let dataFilesToLoad = []
  let loadedDataFileCount = 0

  if (!searchDatabaseLoadingEl && searchInput) {
    searchDatabaseLoadingEl = document.createElement("div")
    searchDatabaseLoadingEl.id = "search-database-loading"
    searchDatabaseLoadingEl.className = "search-database-loading"
    searchDatabaseLoadingEl.style.display = "none"
    searchDatabaseLoadingEl.innerHTML =
      '<span><i class="loading-icon">🔄</i> 数据库加载中...</span> <button id="reload-database-button">重试加载</button>'
    if (searchResults) {
      searchResults.parentNode.insertBefore(searchDatabaseLoadingEl, searchResults)
    } else {
      searchInput.parentNode.insertBefore(searchDatabaseLoadingEl, searchInput.nextSibling)
    }
    const reloadButton = searchDatabaseLoadingEl.querySelector("#reload-database-button")
    if (reloadButton) {
      reloadButton.addEventListener("click", () => {
        if (!isDatabaseLoading) {
          loadDatabaseIndex()
        }
      })
    }
  }

  async function fetchJson(url) {
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} for ${url}`)
    }
    return response.json()
  }

  async function loadAllDataFiles() {
    if (dataFilesToLoad.length === 0) {
      console.log("没有数据文件需要加载。")
      databaseFullyLoaded = true
      isDatabaseLoading = false
      if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = "none"
      if (searchInput && searchInput.value.trim() !== "") {
        updateSearchResults(searchInput.value.toLowerCase().trim())
      }
      return
    }

    isDatabaseLoading = true
    if (searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = "block"
      searchDatabaseLoadingEl.querySelector("span").innerHTML =
        `<span><i class="loading-icon">🔄</i> 数据库加载中 (${loadedDataFileCount}/${dataFilesToLoad.length})...</span>`
    }

    const promises = dataFilesToLoad.map((fileInfo) =>
      fetchJson(fileInfo.path)
        .then((dataChunk) => {
          if (dataChunk.problems && Array.isArray(dataChunk.problems)) {
            problemsData = problemsData.concat(dataChunk.problems)
          }
          loadedDataFileCount++
          if (searchDatabaseLoadingEl) {
            searchDatabaseLoadingEl.querySelector("span").innerHTML =
              `<span><i class="loading-icon">🔄</i> 数据库加载中 (${loadedDataFileCount}/${dataFilesToLoad.length})...</span>`
          }
          if (searchInput && searchInput.value.trim() !== "") {
            updateSearchResults(searchInput.value.toLowerCase().trim())
          }
        })
        .catch((error) => {
          console.error(`加载数据文件 ${fileInfo.path} 失败:`, error)
        }),
    )

    try {
      await Promise.all(promises)
      databaseFullyLoaded = true
      console.log("所有数据库文件加载完成。总条目:", problemsData.length)
      populateSidebarNavigation(problemsData)
      if (problemsData && problemsData.length > 0) {
        calculateAndDisplaySubpageContributors(problemsData)
      }
      collectAllNavLinks()

      loadPageFromHash()
      window.addEventListener("hashchange", loadPageFromHash)
    } catch (error) {
      console.error("加载部分数据库文件时出错:", error)
    } finally {
      isDatabaseLoading = false
      if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = "none"
      if (searchInput && searchInput.value.trim() !== "") {
        updateSearchResults(searchInput.value.toLowerCase().trim())
        filterSidebar(searchInput.value.toLowerCase().trim())
      }
    }
  }

  async function loadDatabaseIndex() {
    if (isDatabaseLoading && !databaseFullyLoaded) {
      console.log("数据库已在加载中...")
      return
    }
    if (databaseFullyLoaded) {
      console.log("数据库已完全加载。")
      if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = "none"
      return
    }

    isDatabaseLoading = true
    databaseFullyLoaded = false
    problemsData = []
    loadedDataFileCount = 0
    dataFilesToLoad = []

    if (searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = "block"
      searchDatabaseLoadingEl.querySelector("span").innerHTML =
        '<span><i class="loading-icon">🔄</i> 正在加载数据库索引...</span>'
    }

    try {
      const indexData = await fetchJson("database/index.json")
      if (indexData && indexData.files && Array.isArray(indexData.files)) {
        dataFilesToLoad = indexData.files
        if (dataFilesToLoad.length > 0) {
          await loadAllDataFiles()
        } else {
          console.log("索引文件中没有数据文件列表。")
          databaseFullyLoaded = true
          isDatabaseLoading = false
          if (searchDatabaseLoadingEl) searchDatabaseLoadingEl.style.display = "none"
        }
      } else {
        throw new Error("数据库索引文件格式不正确。")
      }
    } catch (error) {
      console.error("加载数据库索引失败:", error)
      isDatabaseLoading = false
      if (searchDatabaseLoadingEl) {
        searchDatabaseLoadingEl.querySelector("span").textContent = "数据库加载失败!"
      }
    }
  }

  function populateSidebarNavigation(problems) {
    const problemNavElement = document.getElementById("problem-navigation")
    if (!problemNavElement) {
      console.error("Problem navigation element (#problem-navigation) not found.")
      return
    }

    let ulElement = problemNavElement.querySelector("ul")
    if (!ulElement) {
      console.warn("UL element not found in #problem-navigation, creating one.")
      ulElement = document.createElement("ul")
      problemNavElement.appendChild(ulElement)
    }

    ulElement.innerHTML = ""

    const dynamicallyAddedLinks = []

    problems.forEach((problem) => {
      if (problem.id && staticProblemIdsToExclude.includes(String(problem.id).toLowerCase())) {
        return
      }

      const li = document.createElement("li")
      const a = document.createElement("a")
      a.href = "#"
      a.dataset.page = problem.url
      a.textContent = problem.title
      a.title = problem.title

      li.appendChild(a)
      ulElement.appendChild(li)
      dynamicallyAddedLinks.push(a)
    })
    navLinks = navLinks.concat(dynamicallyAddedLinks)
    collectAllNavLinks()
  }

  function collectAllNavLinks() {
    navLinks = Array.from(document.querySelectorAll(".sidebar nav a[data-page]"))
  }

  function handleSidebarClick(event) {
    const clickedLink = event.target.closest("a[data-page]")
    if (!clickedLink) {
      return
    }
    if (!sidebar || !sidebar.contains(clickedLink)) {
      return
    }

    event.preventDefault()
    const page = clickedLink.dataset.page
    if (page) {
      if (window.location.hash !== `#${page}`) {
        window.location.hash = page
      } else {
        // 这里什么都没有...
      }
      if (searchInput) searchInput.value = ""
      if (searchNotFound) searchNotFound.style.display = "none"
      if (searchResults) searchResults.style.display = "none"
    }
  }

  function loadPageFromHash() {
    if (navLinks.length === 0) {
      console.warn("loadPageFromHash called before navLinks were fully populated.")
    }

    const hash = window.location.hash.substring(1)
    if (hash) {
      const linkElement = navLinks.find((a) => a.dataset.page === hash)

      if (linkElement) {
        console.log(`Loading page from hash: ${hash}, found link element.`)
        loadPage(hash, linkElement)
      } else {
        console.log(
          `Loading page from hash: ${hash}, no corresponding link element found. Attempting to load directly.`,
        )
        loadPage(hash, null)
      }
      if (searchInput) searchInput.value = ""
      if (searchNotFound) searchNotFound.style.display = "none"
      if (searchResults) searchResults.style.display = "none"
    } else {
      console.log("No hash found, displaying default content.")
    }
  }

  collectAllNavLinks()
  if (sidebar) {
    sidebar.addEventListener("click", handleSidebarClick)
  }

  loadDatabaseIndex()

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

  if (mobileMenuToggle && sidebar) {
    mobileMenuToggle.addEventListener("click", (e) => {
      e.stopPropagation()
      e.preventDefault()

      mobileMenuToggle.classList.toggle("active");
      sidebar.classList.toggle("active");

      if (sidebar.classList.contains("active")) {
        document.body.classList.add("body-no-scroll-when-sidebar-is-active");
        document.addEventListener("click", function closeSidebarOnClickOutside(event) {
          if (!sidebar.contains(event.target) && !mobileMenuToggle.contains(event.target) && event.target !== mobileMenuToggle) {
            sidebar.classList.remove("active");
            mobileMenuToggle.classList.remove("active");
            document.body.classList.remove("body-no-scroll-when-sidebar-is-active");
            document.removeEventListener("click", closeSidebarOnClickOutside);
          }
        });
      } else {
        document.body.classList.remove("body-no-scroll-when-sidebar-is-active");
      }
    })
  } else {
    console.error("Mobile menu toggle or sidebar element not found.")
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

      window.scrollTo({ top: 0, behavior: "smooth" })

      if (searchResults) {
        searchResults.style.display = "none"
      }

      if (sidebar.classList.contains("active") && window.innerWidth <= 768) {
        sidebar.classList.remove("active");
        mobileMenuToggle.classList.remove("active");
        document.body.classList.remove("body-no-scroll-when-sidebar-is-active");
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
      if (searchDatabaseLoadingEl && !databaseFullyLoaded) {
        searchDatabaseLoadingEl.style.display = "block"
      } else if (searchDatabaseLoadingEl) {
        searchDatabaseLoadingEl.style.display = "none"
      }
      return
    }

    if (isDatabaseLoading && !databaseFullyLoaded && searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = "block"
    } else if (searchDatabaseLoadingEl) {
      searchDatabaseLoadingEl.style.display = "none"
    }

    const currentProblemsToSearch = problemsData.length > 0 ? problemsData : []

    const matchedProblems = currentProblemsToSearch.filter((problem) => {
      const titleMatch =
        problem && typeof problem.title === "string" && problem.title.toLowerCase().includes(searchTerm)
      const summaryMatch =
        problem && typeof problem.summary === "string" && problem.summary.toLowerCase().includes(searchTerm)
      return titleMatch || summaryMatch
    })

    if (matchedProblems.length > 0) {
      matchedProblems.forEach((problem, index) => {
        const resultItem = document.createElement("a")
        resultItem.href = "#"
        resultItem.textContent = problem.title
        resultItem.dataset.url = problem.url
        resultItem.title = problem.title
        resultItem.style.setProperty("--animation-order", index)

        resultItem.addEventListener("click", (event) => {
          event.preventDefault()
          loadPage(problem.url, resultItem)
          searchResults.style.display = "none"
          searchNotFound.style.display = "none"
        })
        searchResults.appendChild(resultItem)
      })

      searchResults.style.animation = "none"
      searchResults.offsetHeight
      searchResults.style.animation = null

      searchResults.style.display = "block"
      searchNotFound.style.display = "none"
    } else {
      searchResults.style.display = "none"
      if (searchTerm) {
        if (!databaseFullyLoaded && problemsData.length > 0) {
          searchNotFound.innerHTML = `<p>正在搜索已加载的 ${problemsData.length} 条数据... 更多数据仍在后台加载中。</p>`
        } else if (!databaseFullyLoaded && problemsData.length === 0) {
          searchNotFound.innerHTML = `<p>数据库仍在加载中，请稍候或尝试刷新...</p>`
        } else {
          // 这里为了代码正常运行通过没有实际代码
        }

        searchNotFound.style.animation = "none"
        searchNotFound.offsetHeight
        searchNotFound.style.animation = null

        searchNotFound.style.display = "block"
      } else {
        searchNotFound.style.display = "none"
      }
    }
  }

  if (searchInput) {
    searchInput.addEventListener("focus", () => {
      searchInput.style.animation = "none"
      searchInput.offsetHeight
      searchInput.style.animation = "pulse-border 2s infinite alternate"
      searchInput.style.transform = "scale(1.02)"
    })

    searchInput.addEventListener("blur", () => {
      searchInput.style.transform = "scale(1)"
    })
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
  async function fetchProjectContributors() {
    const localContributorsJsonUrl = "database/contributors.json"
    try {
      const response = await fetch(localContributorsJsonUrl + "?v=" + new Date().getTime())
      if (!response.ok) {
        throw new Error(
          `Failed to load local contributors data! Status: ${response.status} from ${localContributorsJsonUrl}`,
        )
      }
      const contributors = await response.json()
      return contributors
    } catch (error) {
      console.error("Failed to fetch local project contributors:", error)
      const container = document.getElementById("contributors-list-container")
      if (container) {
        container.innerHTML = "<p>贡献者信息暂时无法加载。请检查您的网络连接或稍后再试。</p>"
      }
      return null
    }
  }

  function displayContributors(contributorsData) {
    const container = document.getElementById("contributors-list-container")
    if (!container) {
      console.error("Contributors container #contributors-list-container not found.")
      return
    }

    if (!contributorsData || !Array.isArray(contributorsData) || contributorsData.length === 0) {
      container.innerHTML = "<p>暂无贡献者信息或数据加载失败。</p>"
      return
    }

    contributorsData.sort((a, b) => b.contributions - a.contributions)

    container.innerHTML = ""

    contributorsData.forEach((contributor) => {
      if (contributor.type !== "User") return

      const card = document.createElement("div")
      card.className = "contributor-card"

      const avatar = document.createElement("img")
      avatar.src = contributor.avatar_url
      avatar.alt = `${contributor.login} avatar`
      avatar.className = "contributor-avatar"
      avatar.loading = "lazy"
      avatar.onerror = () => {
        avatar.src = "images/minecraft-logo.png"
        avatar.alt = "Avatar placeholder"
      }

      const loginLink = document.createElement("a")
      loginLink.href = contributor.html_url
      loginLink.target = "_blank"
      loginLink.rel = "noopener noreferrer"
      loginLink.className = "contributor-login"
      loginLink.textContent = contributor.login

      const contributionsText = document.createElement("p")
      contributionsText.className = "contributor-contributions"
      contributionsText.textContent = `贡献: ${contributor.contributions}`

      card.appendChild(avatar)
      card.appendChild(loginLink)
      card.appendChild(contributionsText)
      container.appendChild(card)
    })
  }

  function calculateAndDisplaySubpageContributors(allProblemsData) {
    const container = document.getElementById("subpage-contributors-list-container")
    if (!container) {
      console.error("Subpage contributors container #subpage-contributors-list-container not found.")
      return
    }

    if (!allProblemsData || !Array.isArray(allProblemsData) || allProblemsData.length === 0) {
      container.innerHTML = "<p>暂无子页面贡献数据。</p>"
      return
    }

    const authorCounts = {}
    allProblemsData.forEach((problem) => {
      if (problem.authors && Array.isArray(problem.authors)) {
        problem.authors.forEach((authorName) => {
          if (typeof authorName === "string" && authorName.trim() !== "") {
            const cleanAuthorName = authorName.trim()
            authorCounts[cleanAuthorName] = (authorCounts[cleanAuthorName] || 0) + 1
          }
        })
      }
    })

    if (authorCounts["Little_100"]) {
      authorCounts["Little100"] = (authorCounts["Little100"] || 0) + authorCounts["Little_100"]
      delete authorCounts["Little_100"]
    }

    if (Object.keys(authorCounts).length === 0) {
      container.innerHTML = "<p>未在子页面数据中找到作者信息。</p>"
      return
    }

    const sortedAuthors = Object.entries(authorCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)

    container.innerHTML = ""

    sortedAuthors.forEach((author) => {
      const card = document.createElement("div")
      card.className = "contributor-card"

      const loginLink = document.createElement("a")
      loginLink.href = `https://github.com/${author.name}`
      loginLink.target = "_blank"
      loginLink.rel = "noopener noreferrer"
      loginLink.className = "contributor-login"
      loginLink.textContent = author.name

      const contributionsText = document.createElement("p")
      contributionsText.className = "contributor-contributions"
      contributionsText.textContent = `子页面贡献: ${author.count}`

      card.appendChild(loginLink)
      card.appendChild(contributionsText)
      container.appendChild(card)
    })
  }

  fetchProjectContributors().then((contributors) => {
    if (contributors) {
      displayContributors(contributors)
    }
  })
})