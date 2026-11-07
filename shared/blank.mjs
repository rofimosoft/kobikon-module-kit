export function blankModule({ id, label, description, channel, noun }) {
  const text = description || `${label} kayıtları`
  const channelId = channel || "kayitlar"
  const nounText = noun || label.toLocaleLowerCase("tr")
  return {
    id,
    label,
    description: text,
    searchPlaceholder: `${label} içinde ara`,
    tone: "bg-teal-700",
    icon: "mark",
    groups: [
      {
        id: "kayit",
        label: "Kayıt",
        channels: [{ id: channelId, label: channelId, resource: "records" }],
      },
    ],
    resources: {
      records: {
        noun: nounText,
        createLabel: `Yeni ${nounText}`,
        titleField: "title",
        fields: [
          { name: "title", label: "Başlık", required: true },
          {
            name: "status",
            label: "Durum",
            kind: "select",
            required: true,
            defaultValue: "open",
            options: [
              { value: "open", label: "Açık" },
              { value: "done", label: "Bitti" },
            ],
          },
        ],
        seeds: [
          { enterpriseId: "kobikon", title: `${label} kaydı`, status: "open" },
          { enterpriseId: "ege", title: `${label} kaydı`, status: "open" },
          { enterpriseId: "marmara", title: `${label} kaydı`, status: "done" },
        ],
      },
    },
  }
}
