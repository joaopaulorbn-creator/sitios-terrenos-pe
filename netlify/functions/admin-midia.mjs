// Área de gestão: exclui UMA foto ou vídeo de um imóvel.
// Faz um commit no GitHub que remove o arquivo de media/ e tira a referência de data/imoveis.json.
// O commit dispara um novo deploy no Netlify (cerca de 1 minuto).
//
// Variáveis de ambiente (Netlify > Project configuration > Environment variables, escopo Functions):
//   ADMIN_SENHA   senha da área /admin
//   GITHUB_TOKEN  token fine-grained com "Contents: Read and write" só neste repositório
//   GITHUB_REPO   dono/repositório (padrão: joaopaulorbn-creator/sitios-terrenos-pe)
import { timingSafeEqual } from "node:crypto";

const BRANCH = "main";
const DATA = "data/imoveis.json";
const PATH_RE = /^media\/[a-z0-9-]+\/[A-Za-z0-9._-]+$/;

const json = (body, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

function senhaOk(given) {
  const real = Netlify.env.get("ADMIN_SENHA") || "";
  if (!real || typeof given !== "string") return false;
  const a = Buffer.from(given), b = Buffer.from(real);
  return a.length === b.length && timingSafeEqual(a, b);
}

async function gh(path, init = {}) {
  const repo = Netlify.env.get("GITHUB_REPO") || "joaopaulorbn-creator/sitios-terrenos-pe";
  const res = await fetch(`https://api.github.com/repos/${repo}${path}`, {
    ...init,
    headers: {
      authorization: `Bearer ${Netlify.env.get("GITHUB_TOKEN")}`,
      accept: init.raw ? "application/vnd.github.raw+json" : "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
      "user-agent": "sitios-terrenos-pe-admin",
      ...(init.body ? { "content-type": "application/json" } : {}),
    },
  });
  if (!res.ok) {
    const err = new Error(`GitHub ${res.status} em ${path}`);
    err.status = res.status;
    throw err;
  }
  return init.raw ? res.text() : res.json();
}

async function excluir(id, file) {
  const ref = await gh(`/git/ref/heads/${BRANCH}`);
  const head = ref.object.sha;
  const commit = await gh(`/git/commits/${head}`);
  const lista = JSON.parse(await gh(`/contents/${DATA}?ref=${head}`, { raw: true }));
  const imovel = lista.find(r => r.id === id);
  if (!imovel) return { status: 404, erro: "Imóvel não encontrado." };
  const antes = (imovel.fotos?.length || 0) + (imovel.videos?.length || 0);
  imovel.fotos = (imovel.fotos || []).filter(p => p !== file);
  imovel.videos = (imovel.videos || []).filter(p => p !== file);
  if ((imovel.fotos.length + imovel.videos.length) === antes) return { status: 404, erro: "Esse arquivo já não está neste imóvel." };

  // Só apaga o arquivo do repositório se nenhum outro imóvel usar o mesmo caminho.
  const emUso = lista.some(r => [...(r.fotos || []), ...(r.videos || [])].includes(file));
  const tree = [{ path: DATA, mode: "100644", type: "blob", content: JSON.stringify(lista, null, 2) }];
  if (!emUso) tree.push({ path: file, mode: "100644", type: "blob", sha: null });

  const novaArvore = await gh(`/git/trees`, { method: "POST", body: JSON.stringify({ base_tree: commit.tree.sha, tree }) });
  const novo = await gh(`/git/commits`, {
    method: "POST",
    body: JSON.stringify({ message: `Remove mídia de ${id}: ${file.split("/").pop()}`, tree: novaArvore.sha, parents: [head] }),
  });
  await gh(`/git/refs/heads/${BRANCH}`, { method: "PATCH", body: JSON.stringify({ sha: novo.sha, force: false }) });
  return { status: 200, ok: true, restantes: imovel.fotos.length + imovel.videos.length };
}

export default async (req) => {
  if (req.method !== "POST") return json({ erro: "Método não permitido." }, 405);
  let body;
  try { body = await req.json(); } catch { return json({ erro: "Pedido inválido." }, 400); }
  if (!senhaOk(body.senha)) return json({ erro: "Senha incorreta." }, 401);
  if (body.acao === "entrar") return json({ ok: true });
  if (body.acao !== "excluir") return json({ erro: "Ação desconhecida." }, 400);

  const { id, arquivo } = body;
  if (typeof id !== "string" || !/^[a-z0-9-]+$/.test(id) || typeof arquivo !== "string" || !PATH_RE.test(arquivo) || !arquivo.startsWith(`media/${id}/`))
    return json({ erro: "Arquivo inválido." }, 400);
  if (!Netlify.env.get("GITHUB_TOKEN")) return json({ erro: "Falta configurar o GITHUB_TOKEN no Netlify." }, 500);

  // Se outra alteração entrar no meio do caminho, o GitHub recusa (422): tenta de novo uma vez.
  for (let tentativa = 0; tentativa < 2; tentativa++) {
    try {
      const r = await excluir(id, arquivo);
      return json(r.ok ? { ok: true, restantes: r.restantes } : { erro: r.erro }, r.status);
    } catch (e) {
      if (e.status === 422 && tentativa === 0) continue;
      console.error(e);
      return json({ erro: e.status === 401 || e.status === 403 ? "O token do GitHub não tem permissão." : "Não foi possível excluir agora. Tente de novo." }, 502);
    }
  }
};

export const config = {
  path: "/api/admin-midia",
  method: "POST",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
