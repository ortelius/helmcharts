const yaml = require('js-yaml')
const fs = require('fs')
require('process')

const chartRepos = [
  'ortelius/arangodb',
  'ortelius/ortelius',
  'ortelius/frontend',
  'ortelius/osvdev-job',  
  'ortelius/relscanner-job' 
]

// Helper functions
async function get (url) {
  const res = await fetch(url)
  if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url)
  return res
}

async function getChartEntries () {
  let sha = ''

  sha = (await (await get('https://api.github.com/repos/ortelius/helmcharts/commits/main')).json()).sha

  const url = 'https://raw.githubusercontent.com/ortelius/helmcharts/' + sha + '/charts/ortelius/Chart.yaml'
  let parts = []
  let latest = ''
  let ver = ''

  await get(url).then(res => res.text()).then(data => {
      const parsedYaml = yaml.load(data)
      chartVersion = parsedYaml.version
      parts = chartVersion.split('.')
      parts[2] = process.env.RUN_NUMBER
      chartVersion = parts.join('.')
    })

  const latestChart = []

  for (let i = 0; i < chartRepos.length; i++) {
    sha = (await (await get('https://api.github.com/repos/' + chartRepos[i] + '/commits/gh-pages')).json()).sha

    const repoUrl = 'https://raw.githubusercontent.com/' + chartRepos[i] + '/' + sha + '/index.yaml'

    await get(repoUrl).then(res => res.text()).then(data => {
      const parsedYaml = yaml.load(data)
      const entries = parsedYaml.entries

      Object.keys(entries).forEach(key => {
        latest = null

        Object.entries(entries[key]).forEach(entry => {
          if (latest == null) { latest = entry } else if (latest.created < entry.created) { latest = entry }
        })
        latest = latest[1]

        const dep = {}
        dep.name = latest.name
        dep.version = latest.version
        dep.repository = 'https://ortelius.github.io/' + key + '/'
        latestChart.push(dep)
      })
    })
  }
  chartEntries = latestChart
  return latestChart
}

function createYamlOutput () {
  const output = yaml.dump({
    apiVersion: 'v2',
    name: 'ortelius',
    description: 'Post-Deployment Vulnerability Detection and AI Remediation',
    home: 'https://ortelius.io',
    icon: 'https://ortelius.github.io/helmcharts/ortelius.svg',
    keywords: ['Vulnerability', 'Remediation', 'AI', 'SBOM'],
    type: 'application',
    version: chartVersion,
    appVersion: '12.0.0',
    dependencies: chartEntries
  }, { noArrayIndent: true })

  fs.readFile('./charts/ortelius/README.md', 'utf8', function (err, data) {
    if (err) {
      return console.log(err)
    }
    const result = data.replace(/DEPLOYHUB_VERSION=\d+\.\d+\.\d+/g, 'DEPLOYHUB_VERSION=' + chartVersion)

    fs.writeFile('./charts/ortelius/README.md', result, 'utf8', function (err) {
      if (err) return console.log(err)
    })
  })

  return output
}
// -----------------

let chartEntries = []
let chartVersion = ''

getChartEntries().then(() => {
  const yamlOutput = createYamlOutput()
  console.log(yamlOutput)
  fs.writeFileSync('./charts/ortelius/Chart.yaml', yamlOutput, 'utf8', (err) => {
    console.log(err)
  })
})