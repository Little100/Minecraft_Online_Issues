const { Octokit } = require("@octokit/rest");
const fs = require("fs").promises;
const path = require("path");

const GITHUB_OWNER = "Little100";
const GITHUB_REPO = "Minecraft_Online_Issues";
const OUTPUT_PATH = path.join(__dirname, "..", "database", "contributors.json");

const GITHUB_TOKEN = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

const octokit = new Octokit({
    auth: GITHUB_TOKEN,
});

async function fetchContributors() {
    try {
        console.log(`Fetching contributors for ${GITHUB_OWNER}/${GITHUB_REPO}...`);
        const { data: contributorsList } = await octokit.repos.listContributors({
            owner: GITHUB_OWNER,
            repo: GITHUB_REPO,
            anon: "true",
        });

        console.log(`Found ${contributorsList.length} contributors.`);

        const simplifiedContributors = contributorsList.map(c => ({
            login: c.login,
            id: c.id,
            avatar_url: c.avatar_url,
            html_url: c.html_url,
            contributions: c.contributions,
            type: c.type,
        }));

        await fs.writeFile(OUTPUT_PATH, JSON.stringify(simplifiedContributors, null, 2));
        console.log(`Contributors data successfully written to ${OUTPUT_PATH}`);

    } catch (error) {
        console.error("Error fetching or writing contributors data:", error.status, error.message);
        if (error.response && error.response.data) {
            console.error("GitHub API Response Data:", error.response.data);
        }
        process.exit(1);
    }
}

fetchContributors();