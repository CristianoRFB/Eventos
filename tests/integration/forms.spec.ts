import {
  test,
  expect,
  request,
  type APIRequestContext,
} from "@playwright/test";
import { setTimeout as delay } from "node:timers/promises";
import { starterContent, type ContentDocument } from "../../app/domain/content";
import { formDefinitionSchema } from "../../app/domain/forms";

const adminOrigin = "http://localhost:5173";
const publicOrigin = "http://evento-a.example.test";
const base = "/api/v1/orgs/org-a/editions/edition-a";
let owner: APIRequestContext,
  foreign: APIRequestContext,
  reviewer: APIRequestContext,
  editor: APIRequestContext,
  visitor: APIRequestContext,
  visitorB: APIRequestContext;
async function login(account: string) {
  const client = await request.newContext({
    baseURL: adminOrigin,
    extraHTTPHeaders: { Origin: adminOrigin },
  });
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await client.post("/api/auth/sign-in/email", {
      data: {
        email: `${account}@example.test`,
        password: "TEST_ONLY-Local-2026!",
      },
    });
    if (response.status() !== 429) {
      expect(response.status()).toBe(200);
      return client;
    }
    await delay(
      Math.min(
        60,
        Math.max(1, Number(response.headers()["retry-after"] ?? 10)),
      ) *
        1000 +
        100,
    );
  }
  throw new Error(
    "Local authentication limiter did not permit fixture sign-in",
  );
}
test.beforeAll(async () => {
  test.setTimeout(180000);
  owner = await login("owner-a");
  foreign = await login("owner-b");
  reviewer = await login("reviewer-a");
  editor = await login("editor-a");
  visitor = await request.newContext({
    baseURL: adminOrigin,
    extraHTTPHeaders: { Host: "evento-a.example.test", Origin: publicOrigin },
  });
  visitorB = await request.newContext({
    baseURL: adminOrigin,
    extraHTTPHeaders: {
      Host: "evento-b.example.test",
      Origin: "http://evento-b.example.test",
    },
  });
});
test.afterAll(async () => {
  await Promise.all(
    [owner, foreign, reviewer, editor, visitor, visitorB]
      .filter(Boolean)
      .map((c) => c.dispose()),
  );
});

test("versioned forms keep submissions private, deduplicate races, enforce review and revoke public consent immediately", async () => {
  test.setTimeout(120000);
  const initial = (await (await owner.get(`${base}/draft`)).json()) as {
    revision: number;
  };
  expect(
    (
      await owner.post(`${base}/draft`, {
        data: {
          expectedRevision: initial.revision,
          content: structuredClone(starterContent),
        },
      })
    ).status(),
  ).toBe(201);
  const definition = formDefinitionSchema.parse({
    name: `Inscrição fictícia ${Date.now()}`,
    privacyNotice:
      "Dados sintéticos usados somente para o ensaio privado local desta edição. Nenhuma mensagem será enviada.",
    consentLabel: "Aceito o tratamento para análise desta candidatura fictícia",
    retentionDays: 30,
    deadlineAt: new Date(Date.now() + 86400000).toISOString(),
    fields: [
      {
        key: "email",
        label: "Contato profissional",
        type: "email",
        required: true,
      },
      { key: "project", label: "Projeto", type: "text", required: true },
    ],
  });
  const created = await owner.post(`${base}/forms`, { data: { definition } });
  expect(created.status(), await created.text()).toBe(201);
  const form = (await created.json()) as {
    id: string;
    definitionId: string;
    revision: number;
  };
  const formsBase = `${base}/forms/${form.id}`;
  expect(
    (
      await foreign.get(
        `/api/v1/orgs/org-b/editions/edition-b/forms/${form.id}`,
      )
    ).status(),
  ).toBe(404);
  expect(
    (await editor.post(`${base}/forms`, { data: { definition } })).status(),
  ).toBe(403);
  const draft = async () =>
    (await (await owner.get(`${base}/draft`)).json()) as {
      revision: number;
      content: ContentDocument;
    };
  const stage = async (definitionId: string) => {
    const current = await draft();
    const response = await owner.post(`${formsBase}/stage`, {
      data: { expectedDraftRevision: current.revision, definitionId },
    });
    expect(response.status(), await response.text()).toBe(201);
    return ((await response.json()) as { revision: number }).revision;
  };
  const publish = async (revision: number) => {
    const history = (await (await owner.get(`${base}/revisions`)).json()) as {
      current: { revision: number } | null;
    };
    const response = await owner.post(`${base}/publish`, {
      data: {
        draftRevision: revision,
        expectedPublicationRevision: history.current?.revision ?? 0,
      },
    });
    expect(response.status(), await response.text()).toBe(201);
    return ((await response.json()) as { revision: number }).revision;
  };
  expect(
    (
      await owner.post(`${formsBase}/state`, {
        data: { expectedRevision: 1, state: "open" },
      })
    ).status(),
  ).toBe(200);
  const staged = await stage(form.definitionId);
  const submitUrl = `/api/v1/public/forms/${form.id}/submit`;
  const payload = {
    definitionId: form.definitionId,
    idempotencyKey: crypto.randomUUID(),
    answers: {
      email: "private-f6@example.test",
      project: "Projeto sintético confidencial",
    },
    privacyAccepted: true,
    listingOptIn: true,
    publicProfile: {
      name: "Ateliê fictício autorizado",
      description: "<script>window.__profile_xss=true</script> texto literal.",
      website: "https://example.test/perfil",
      category: "Arte",
    },
  };
  expect((await visitor.post(submitUrl, { data: payload })).status()).toBe(404);
  await publish(staged);
  expect((await visitorB.post(submitUrl, { data: payload })).status()).toBe(
    404,
  );
  expect(
    (
      await visitor.post(submitUrl, {
        headers: { Origin: "https://evil.example.test" },
        data: payload,
      })
    ).status(),
  ).toBe(403);
  expect(
    (
      await visitor.post(submitUrl, {
        data: { ...payload, websiteTrap: "spam" },
      })
    ).status(),
  ).toBe(400);
  expect(
    (
      await visitor.post(submitUrl, {
        data: { ...payload, privacyAccepted: false },
      })
    ).status(),
  ).toBe(400);
  const submitted = await visitor.post(submitUrl, { data: payload });
  expect(submitted.status(), await submitted.text()).toBe(201);
  const receipt = (await submitted.json()) as {
    receipt: string;
    statusUrl: string;
  };
  expect(receipt.receipt).toMatch(/^[a-f0-9]{64}$/);
  expect(submitted.headers()["cache-control"]).toContain("no-store");
  const duplicate = await visitor.post(submitUrl, { data: payload });
  expect(duplicate.status()).toBe(200);
  expect((await duplicate.json()).receipt).toBe(receipt.receipt);
  expect(
    (
      await visitor.post(submitUrl, {
        data: {
          ...payload,
          answers: { ...payload.answers, project: "Outro conteúdo" },
        },
      })
    ).status(),
  ).toBe(409);
  const racePayload = { ...payload, idempotencyKey: crypto.randomUUID() };
  const race = await Promise.all([
    visitor.post(submitUrl, { data: racePayload }),
    visitor.post(submitUrl, { data: racePayload }),
  ]);
  expect(race.map((r) => r.status()).sort()).toEqual([200, 201]);
  expect((await race[0].json()).receipt).toBe((await race[1].json()).receipt);
  const receiptApi = `/api/v1/public/applications/${receipt.receipt}`;
  const status = await visitor.get(receiptApi);
  expect(status.status()).toBe(200);
  expect(await status.text()).not.toContain("private-f6@example.test");
  expect((await visitorB.get(receiptApi)).status()).toBe(404);
  expect(
    (
      await visitor.get("/api/v1/public/applications/" + "a".repeat(64))
    ).status(),
  ).toBe(404);
  // The only export surface is reviewer-authorized, org-scoped and no-store.
  const exported = await owner.get(`${base}/applications/export?page=0`);
  expect(exported.status(), await exported.text()).toBe(200);
  expect(exported.headers()["content-type"]).toContain("text/csv");
  expect(exported.headers()["cache-control"]).toContain("no-store");
  expect(exported.headers()["content-disposition"]).toContain("attachment");
  const csv = await exported.text();
  expect(csv).toContain("private-f6@example.test");
  expect(csv).toContain("respostas_json");
  expect(
    (await editor.get(`${base}/applications/export?page=0`)).status(),
  ).toBe(403);
  const otherOrgExport = await foreign.get(
    "/api/v1/orgs/org-b/editions/edition-b/applications/export?page=0",
  );
  expect(otherOrgExport.status()).toBe(200);
  expect(await otherOrgExport.text()).not.toContain("private-f6@example.test");
  expect(
    (await owner.post(`${base}/applications/export`, { data: {} })).status(),
  ).toBe(405);
  const list = (await (await owner.get(`${base}/applications`)).json()) as {
    id: string;
    form_name: string;
  }[];
  const app = list.filter((item) => item.form_name === definition.name).at(-1);
  expect(app).toBeTruthy();
  const applicationId = app!.id;
  const appPath = `/api/v1/orgs/org-a/applications/${applicationId}`;
  const detail = await reviewer.get(appPath);
  expect(detail.status(), await detail.text()).toBe(200);
  expect((await detail.json()).answers.email).toBe("private-f6@example.test");
  expect(detail.headers()["cache-control"]).toContain("no-store");
  expect(
    (
      await foreign.get(`/api/v1/orgs/org-b/applications/${applicationId}`)
    ).status(),
  ).toBe(404);
  expect((await editor.get(appPath)).status()).toBe(403);
  // End-to-end private R2 upload: real local Worker and synthetic D1/R2 fixture.
  const png = new Uint8Array(57);
  png.set([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a]);
  const pngView = new DataView(png.buffer);
  pngView.setUint32(8, 13);
  png.set([0x49,0x48,0x44,0x52],12);
  pngView.setUint32(16, 2);
  pngView.setUint32(20, 2);
  png[24]=8; png[25]=6;
  png.set([0x49,0x44,0x41,0x54],37);
  png.set([0x49,0x45,0x4e,0x44],49);
  const uploadPath = `${receiptApi}/attachments`;
  const uploadHeaders = { "Content-Type": "image/png", "X-File-Name": "prova.png" };
  expect((await visitor.post(uploadPath, {
    headers: { ...uploadHeaders, "Content-Type": "text/html" },
    data: Buffer.from(png),
  })).status()).toBe(400);
  expect((await visitorB.post(uploadPath, {
    headers: uploadHeaders,
    data: Buffer.from(png),
  })).status()).not.toBe(201);
  const uploaded = await visitor.post(uploadPath, {
    headers: uploadHeaders,
    data: Buffer.from(png),
  });
  expect(uploaded.status(), await uploaded.text()).toBe(201);
  const imageId = (await uploaded.json() as { id: string }).id;
  expect(imageId).toMatch(/^[a-f0-9-]{36}$/);
  const attachmentAdmin = `${appPath}/attachments`;
  expect((await editor.get(attachmentAdmin)).status()).toBe(403);
  expect((await foreign.get(`/api/v1/orgs/org-b/applications/${applicationId}/attachments`)).status()).toBe(404);
  const attachmentsList = await reviewer.get(attachmentAdmin);
  expect(attachmentsList.status()).toBe(200);
  expect(await attachmentsList.json()).toContainEqual(
    expect.objectContaining({ id: imageId, original_name: "prova.png", mime: "image/png" }),
  );
  const downloaded = await reviewer.get(`${attachmentAdmin}/${imageId}`);
  expect(downloaded.status(), await downloaded.text()).toBe(200);
  expect(downloaded.headers()["cache-control"]).toContain("no-store");
  expect(downloaded.headers()["content-disposition"]).toContain("attachment;");
  expect(Buffer.from(await downloaded.body())).toEqual(Buffer.from(png));
  for (let i = 0; i < 2; i++) {
    const extra = await visitor.post(uploadPath, {
      headers: uploadHeaders, data: Buffer.from(png),
    });
    expect(extra.status(), await extra.text()).toBe(201);
  }
  expect((await visitor.post(uploadPath, {
    headers: uploadHeaders, data: Buffer.from(png),
  })).status()).toBe(409);
  const needsInfo = await reviewer.post(`${appPath}/review`, {
    data: {
      expectedRevision: 1,
      status: "needs_info",
      applicantMessage: "Informe uma descrição complementar.",
    },
  });
  expect(needsInfo.status(), await needsInfo.text()).toBe(200);
  const needsInfoReceipt = await (await visitor.get(receiptApi)).json() as {
    status: string;
    revision: number;
    canReply: boolean;
  };
  expect(needsInfoReceipt).toMatchObject({
    status: "needs_info",
    revision: 2,
    canReply: true,
  });
  const replyPath = `${receiptApi}/reply`;
  expect((await visitorB.post(replyPath, { data: {
    expectedRevision: 2, message: "Tentativa de outra organizadora",
  } })).status()).toBe(404);
  expect((await visitor.post(replyPath, {
    headers: { Origin: "https://evil.example.test" },
    data: { expectedRevision: 2, message: "Origem forjada" },
  })).status()).toBe(403);
  expect((await visitor.post(replyPath, {
    data: { expectedRevision: 2, message: "" },
  })).status()).toBe(400);
  const followUp = await visitor.post(replyPath, {
    data: {
      expectedRevision: 2,
      message: "Descrição complementar privada para análise.",
    },
  });
  expect(followUp.status(), await followUp.text()).toBe(200);
  expect(await followUp.json()).toMatchObject({
    status: "submitted",
    revision: 3,
  });
  expect((await visitor.post(replyPath, {
    data: { expectedRevision: 2, message: "Duplicação" },
  })).status()).toBe(409);
  const followUpRead = await reviewer.get(appPath);
  expect(followUpRead.status(), await followUpRead.text()).toBe(200);
  const followUpData = await followUpRead.json() as {
    applicantReplies: { message: string }[];
  };
  expect(followUpData.applicantReplies).toEqual([
    expect.objectContaining({
      message: "Descrição complementar privada para análise.",
    }),
  ]);
  const publicReceiptBody = await (await visitor.get(receiptApi)).text();
  expect(publicReceiptBody).not.toContain(
    "Descrição complementar privada para análise.",
  );
  expect(
    (
      await reviewer.post(`${appPath}/review`, {
        data: {
          expectedRevision: 3,
          status: "approved",
          applicantMessage: "Aprovação fictícia para o ensaio.",
        },
      })
    ).status(),
  ).toBe(200);
  expect((await (await visitor.get(receiptApi)).json()).status).toBe(
    "approved",
  );
  expect(
    (
      await reviewer.post(`${appPath}/review`, {
        data: {
          expectedRevision: 1,
          status: "rejected",
          applicantMessage: "Estado obsoleto",
        },
      })
    ).status(),
  ).toBe(409);
  const publicGet = (path: string) => visitor.get(path);
  expect(await (await publicGet("/expositores")).text()).not.toContain(
    payload.publicProfile.name,
  );
  const current = await draft();
  expect(
    (
      await reviewer.post(`${appPath}/stage-profile`, {
        data: { expectedDraftRevision: current.revision },
      })
    ).status(),
  ).toBe(403);
  const selected = await owner.post(`${appPath}/stage-profile`, {
    data: { expectedDraftRevision: current.revision },
  });
  expect(selected.status(), await selected.text()).toBe(201);
  expect(await (await publicGet("/expositores")).text()).not.toContain(
    payload.publicProfile.name,
  );
  const publication = await publish(
    ((await selected.json()) as { revision: number }).revision,
  );
  const directory = await publicGet("/expositores");
  const directoryHtml = await directory.text();
  expect(directoryHtml).toContain(payload.publicProfile.name);
  expect(directoryHtml).not.toContain("private-f6@example.test");
  expect(directoryHtml).not.toContain("Projeto sintético confidencial");
  expect(directoryHtml).not.toContain(
    "<script>window.__profile_xss=true</script>",
  );
  expect(directory.headers()["cache-control"]).toContain("no-store");
  // The primary receipt and the concurrent receipt may correspond to different
  // entries; revoke the one explicitly selected for this listing.
  const selectedDetail = (await (await owner.get(appPath)).json()) as {
    answers: { email: string };
  };
  expect(selectedDetail.answers.email).toBe("private-f6@example.test");
  const submittedReceipts = [
    receipt.receipt,
    (await race[0].json()).receipt as string,
  ];
  for (const token of submittedReceipts)
    expect(
      (
        await visitor.post(`/api/v1/public/applications/${token}/withdraw`, {
          data: {},
        })
      ).status(),
    ).toBe(200);
  expect((await reviewer.get(`${attachmentAdmin}/${imageId}`)).status()).toBe(404);
  expect((await visitor.post(uploadPath, {
    headers: uploadHeaders, data: Buffer.from(png),
  })).status()).toBe(410);
  const revoked = await publicGet("/expositores");
  expect(await revoked.text()).not.toContain(payload.publicProfile.name);
  expect(revoked.headers()["x-publication-revision"]).toBe(String(publication));
  expect((await (await owner.get(appPath)).json()).answers).toBeNull();
  expect((await (await visitor.get(receiptApi)).json()).status).toBe(
    "withdrawn",
  );
  const formState = (await (await owner.get(formsBase)).json()) as {
    revision: number;
  };
  const nextDefinition = {
    ...definition,
    fields: [
      ...definition.fields,
      {
        key: "extra",
        label: "Informação complementar",
        type: "text" as const,
        required: true,
        options: [],
      },
    ],
  };
  const versions = await Promise.all([
    owner.post(`${formsBase}/definitions`, {
      data: {
        expectedRevision: formState.revision,
        definition: nextDefinition,
      },
    }),
    owner.post(`${formsBase}/definitions`, {
      data: {
        expectedRevision: formState.revision,
        definition: nextDefinition,
      },
    }),
  ]);
  expect(versions.map((r) => r.status()).sort()).toEqual([201, 409]);
  const nextVersion = (await versions
    .find((r) => r.status() === 201)!
    .json()) as { definitionId: string; revision: number };
  await publish(await stage(nextVersion.definitionId));
  expect(
    (
      await visitor.post(submitUrl, {
        data: { ...payload, idempotencyKey: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
  const newerPayload = {
    ...payload,
    definitionId: nextVersion.definitionId,
    idempotencyKey: crypto.randomUUID(),
    listingOptIn: false,
    publicProfile: undefined,
    answers: { ...payload.answers, extra: "Resposta privada" },
  };
  const noConsent = await visitor.post(submitUrl, { data: newerPayload });
  expect(noConsent.status(), await noConsent.text()).toBe(201);
  const activeApplications = (await (
    await owner.get(`${base}/applications`)
  ).json()) as { id: string; form_name: string; submission_state: string }[];
  const optedOut = activeApplications.find(
    (a) => a.form_name === definition.name && a.submission_state === "active",
  )!;
  expect(
    (
      await reviewer.post(
        `/api/v1/orgs/org-a/applications/${optedOut.id}/review`,
        {
          data: {
            expectedRevision: 1,
            status: "approved",
            applicantMessage: "Aprovação sem consentimento de listagem",
          },
        },
      )
    ).status(),
  ).toBe(200);
  expect(
    (
      await owner.post(
        `/api/v1/orgs/org-a/applications/${optedOut.id}/stage-profile`,
        { data: { expectedDraftRevision: (await draft()).revision } },
      )
    ).status(),
  ).toBe(400);
  expect(
    (
      await visitor.post(submitUrl, {
        data: {
          ...newerPayload,
          idempotencyKey: crypto.randomUUID(),
          answers: { ...newerPayload.answers, forged: "campo extra" },
        },
      })
    ).status(),
  ).toBe(400);
  let limited = false;
  for (let attempt = 0; attempt < 25; attempt++) {
    const response = await visitor.post(submitUrl, {
      data: { ...newerPayload, idempotencyKey: crypto.randomUUID() },
    });
    if (response.status() === 429) {
      expect(response.headers()["retry-after"]).toBe("60");
      limited = true;
      break;
    }
    expect(response.status(), await response.text()).toBe(201);
  }
  expect(limited).toBe(true);
  expect((await visitor.post(submitUrl, { data: newerPayload })).status()).toBe(
    200,
  );
  expect(
    (
      await owner.post(`${formsBase}/state`, {
        data: { expectedRevision: nextVersion.revision, state: "closed" },
      })
    ).status(),
  ).toBe(200);
  expect(
    (
      await visitor.post(submitUrl, {
        data: { ...newerPayload, idempotencyKey: crypto.randomUUID() },
      })
    ).status(),
  ).toBe(409);
});
